# HH-LEWS — Improvement Spec: Crowdsourced Media Evidence System
## Photo & Video Upload with AI Verification

**Version:** 1.0 | **Type:** Feature Improvement Specification  
**Scope:** Citizen PWA + Backend API + ML Verification Pipeline  
**Priority:** High — turns citizens into real-time ground-truth sensors

---

## 1. Problem This Solves

The current system is entirely sensor-driven. It has no mechanism to receive ground-truth visual confirmation from humans who are physically present at a disaster site. This creates two gaps:

**Gap 1 — False negative blind spots.** ML models can miss a landslide that hasn't yet triggered sensor thresholds. A villager who can see debris falling on a road has information the system does not.

**Gap 2 — Alert credibility.** When officials receive an automated alert, they must decide whether to mobilize SDRF. A photograph with GPS coordinates and a timestamp from a person on the ground dramatically increases credibility and speeds that decision.

**The photo upload feature turns citizens into a crowdsourced sensor network.**

---

## 2. Core Flow

```
Citizen takes photo/video during emergency
        │
        ▼
Upload via PWA (with device GPS location auto-captured)
        │
        ▼
Backend: receive file → store securely → run AI verification pipeline
        │
        ├── AI verification: real event? fresh? location matches?
        │
        ├── PASS → correlate to nearest zone → boost zone risk score
        │          → notify DDMO dashboard → attach to alert event
        │
        └── FAIL → flag as unverified → no score boost → DDMO sees it
                   with "unverified" badge
```

---

## 3. What Citizens Can Submit

| Type | Max Size | Formats | Time Limit |
|------|---------|---------|-----------|
| Photo | 10 MB | JPG, JPEG, PNG, WEBP | Any time, but prioritized within 2 hours of event |
| Short video | 50 MB | MP4, MOV, WEBM | ≤ 60 seconds |

All submissions are **geotagged automatically** using the browser's Geolocation API at time of upload. Users who deny location permission cannot submit (location is mandatory for zone correlation).

---

## 4. Database Schema

### 4.1 New Table — `media_reports`

```sql
CREATE TABLE media_reports (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id               UUID REFERENCES zones(id),       -- Auto-assigned based on GPS
  uploaded_by_phone     BYTEA,                            -- Encrypted phone (nullable for anonymous)
  media_type            VARCHAR(10) NOT NULL,             -- 'photo' | 'video'
  file_key              VARCHAR(500) NOT NULL,            -- S3 object key
  file_size_bytes       INTEGER,
  thumbnail_key         VARCHAR(500),                     -- S3 key for generated thumbnail
  lat                   FLOAT NOT NULL,
  lon                   FLOAT NOT NULL,
  accuracy_meters       FLOAT,                            -- Device GPS accuracy
  device_timestamp      TIMESTAMPTZ NOT NULL,             -- Timestamp from device
  server_received_at    TIMESTAMPTZ DEFAULT NOW(),
  description_raw       TEXT,                             -- Optional text from submitter
  language              VARCHAR(20) DEFAULT 'hi',

  -- AI Verification fields
  verification_status   VARCHAR(20) DEFAULT 'pending',
  -- 'pending' | 'verified' | 'unverified' | 'fake' | 'duplicate'
  verification_score    FLOAT,                            -- 0.0–1.0 AI confidence
  is_fresh              BOOLEAN,                          -- Image metadata vs current time
  metadata_timestamp    TIMESTAMPTZ,                      -- EXIF datetime if present
  location_match        BOOLEAN,                          -- GPS vs zone boundary match
  duplicate_hash        VARCHAR(64),                      -- Perceptual hash for dedup
  ai_labels             JSONB,                            -- Vision API detected labels
  ai_flags              TEXT[],                           -- ['old_image', 'no_landslide', 'stock_photo']

  -- Moderation
  reviewed_by_user_id   UUID REFERENCES users(id),        -- DDMO who reviewed
  reviewed_at           TIMESTAMPTZ,
  review_notes          TEXT,

  -- Impact
  risk_boost_applied    BOOLEAN DEFAULT FALSE,            -- Did this increase zone risk?
  risk_boost_amount     FLOAT DEFAULT 0.0,                -- How much it added to score
  linked_alert_event_id UUID REFERENCES alert_events(id),

  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_media_reports_zone ON media_reports (zone_id, created_at DESC);
CREATE INDEX idx_media_reports_status ON media_reports (verification_status);
CREATE INDEX idx_media_reports_location ON media_reports USING GIST (
  ST_SetSRID(ST_Point(lon, lat), 4326)
);
```

---

## 5. API Endpoints

### 5.1 `POST /api/reports/upload`

**Description:** Citizen submits a photo or video from the PWA. Location is auto-captured by the browser. Returns immediately with a report ID and queues AI verification.

**Auth:** No JWT required (public) but phone OTP verification is strongly recommended to reduce spam. Anonymous uploads are allowed but receive lower credibility weight.

**Request:** `multipart/form-data`

```
Field         Type      Required  Description
───────────────────────────────────────────────────────────
file          File      Yes       Image or video file
lat           Float     Yes       Device GPS latitude
lon           Float     Yes       Device GPS longitude
accuracy_m    Float     No        GPS accuracy in metres
description   String    No        Submitter's description (any language)
language      String    No        Submitter's language (hi/en/hi-x-garhwali/etc.)
phone_hash    String    No        SHA-256 of phone (if registered subscriber)
```

**Response:**
```json
{
  "report_id": "uuid",
  "status": "received",
  "zone_id": "uuid",
  "zone_name": "Joshimath Slope Zone",
  "message": "आपकी रिपोर्ट मिल गई। जाँच हो रही है। — Report received. Verification in progress.",
  "estimated_review_minutes": 5
}
```

**Status Codes:**
| Code | Meaning |
|------|---------|
| `202` | Accepted. File uploaded, verification queued. |
| `400` | Missing GPS coordinates or unsupported file format. |
| `413` | File too large (> 10MB photo / > 50MB video). |
| `429` | Rate limit — max 3 uploads per phone per hour. |

---

### 5.2 `GET /api/reports/:report_id/status`

**Description:** Citizen polls for verification result.

```json
{
  "report_id": "uuid",
  "status": "verified",
  "verification_score": 0.87,
  "zone_name": "Joshimath Slope Zone",
  "risk_boost_applied": true,
  "message": "आपकी रिपोर्ट सत्यापित हुई। DDMO को सूचित किया गया।"
}
```

---

### 5.3 `GET /api/dashboard/reports` (JWT — DDMO+)

**Description:** Official dashboard endpoint. Returns all media reports for the official's district, filterable by status.

**Query params:** `?zone_id=<uuid>`, `?status=pending|verified|fake`, `?hours=24`

**Response:**
```json
{
  "reports": [
    {
      "id": "uuid",
      "zone_name": "Joshimath Slope Zone",
      "media_type": "photo",
      "thumbnail_url": "https://cdn.hhlews.in/thumbnails/...",
      "lat": 30.5568,
      "lon": 79.5643,
      "device_timestamp": "ISO8601",
      "verification_status": "pending",
      "verification_score": null,
      "ai_labels": null,
      "is_fresh": null,
      "description": "पहाड़ से पत्थर गिर रहे हैं",
      "risk_boost_applied": false
    }
  ],
  "total": 12,
  "pending": 3,
  "verified": 8,
  "flagged": 1
}
```

---

### 5.4 `POST /api/dashboard/reports/:report_id/review` (JWT — DDMO+)

**Description:** DDMO manually reviews a flagged or unverified report. Override AI verdict.

```json
{
  "decision": "verified | fake | duplicate",
  "notes": "Confirmed by block officer — active debris flow on NH-58"
}
```

---

## 6. AI Verification Pipeline

The verification pipeline runs as a Celery task immediately after file upload. It answers four questions:

**Q1: Does the image contain evidence of a landslide-related event?**  
**Q2: Is the image freshly taken (not an old or stock photo)?**  
**Q3: Does the GPS location match the claimed zone?**  
**Q4: Is this a duplicate of another recently submitted image?**

### 6.1 Celery Verification Task

```python
# services/worker/tasks/media_verification.py

@celery.task(bind=True, max_retries=2)
def verify_media_report(self, report_id: str):
    report = db.fetch_media_report(report_id)
    file_bytes = s3.get_object(report.file_key)

    results = {}

    # ── CHECK 1: Vision AI — Does it show a landslide? ────────────────
    results['vision'] = run_vision_check(file_bytes, report.media_type)

    # ── CHECK 2: Image freshness — EXIF vs current time ───────────────
    results['freshness'] = check_image_freshness(file_bytes, report.device_timestamp)

    # ── CHECK 3: Location plausibility ───────────────────────────────
    results['location'] = check_location_match(report.lat, report.lon, report.zone_id)

    # ── CHECK 4: Perceptual hash dedup ───────────────────────────────
    results['duplicate'] = check_duplicate(file_bytes)

    # ── Aggregate into verification_score ─────────────────────────────
    score, status, flags = aggregate_verification(results)

    db.update_media_report(report_id, {
        'verification_status': status,
        'verification_score': score,
        'is_fresh': results['freshness']['is_fresh'],
        'metadata_timestamp': results['freshness']['exif_timestamp'],
        'location_match': results['location']['matches'],
        'duplicate_hash': results['duplicate']['hash'],
        'ai_labels': results['vision']['labels'],
        'ai_flags': flags,
    })

    if status == 'verified' and score >= 0.75:
        apply_risk_boost(report.zone_id, score, report_id)
        notify_ddmo_dashboard(report.zone_id, report_id)
```

### 6.2 Vision AI Check

Uses **Google Cloud Vision API** (or AWS Rekognition as fallback) to detect labels in the image.

```python
def run_vision_check(file_bytes: bytes, media_type: str) -> dict:
    """
    Calls Google Cloud Vision API label detection.
    Returns detected labels and a landslide-relevance score.
    """
    from google.cloud import vision

    client = vision.ImageAnnotatorClient()
    image  = vision.Image(content=file_bytes)

    # Label detection
    label_response = client.label_detection(image=image)
    labels = {label.description.lower(): label.score
              for label in label_response.label_annotations}

    # Safe search (detect inappropriate content)
    safe_search = client.safe_search_detection(image=image).safe_search_annotation

    # Landslide-relevant label keywords
    RELEVANT_LABELS = {
        'high_confidence': [
            'landslide', 'mudslide', 'rockslide', 'debris flow',
            'mud', 'rubble', 'collapsed road', 'boulder', 'rock fall',
            'flood', 'erosion', 'hillside', 'mountain debris'
        ],
        'supporting': [
            'rain', 'water', 'mountain', 'road', 'destruction',
            'natural disaster', 'storm', 'slope', 'cliff', 'hill'
        ]
    }

    relevance_score = 0.0
    matched_labels = []

    for label, confidence in labels.items():
        for keyword in RELEVANT_LABELS['high_confidence']:
            if keyword in label:
                relevance_score += confidence * 0.4
                matched_labels.append({'label': label, 'confidence': confidence, 'type': 'high'})
                break

        for keyword in RELEVANT_LABELS['supporting']:
            if keyword in label:
                relevance_score += confidence * 0.15
                matched_labels.append({'label': label, 'confidence': confidence, 'type': 'supporting'})
                break

    relevance_score = min(relevance_score, 1.0)

    return {
        'labels': matched_labels,
        'relevance_score': relevance_score,
        'is_relevant': relevance_score >= 0.35,
        'flagged_inappropriate': safe_search.adult.value >= 3
    }
```

### 6.3 Image Freshness Check

```python
def check_image_freshness(file_bytes: bytes, device_timestamp: datetime) -> dict:
    """
    Extracts EXIF datetime from image metadata.
    Compares to device_timestamp and current server time.
    Flags images older than 6 hours as potentially stale.
    """
    from PIL import Image
    from PIL.ExifTags import TAGS
    import io

    exif_timestamp = None
    is_fresh = True
    flags = []

    try:
        img = Image.open(io.BytesIO(file_bytes))
        exif_data = img._getexif()
        if exif_data:
            for tag_id, value in exif_data.items():
                tag = TAGS.get(tag_id, tag_id)
                if tag == 'DateTimeOriginal':
                    exif_timestamp = datetime.strptime(value, '%Y:%m:%d %H:%M:%S')
                    break
    except Exception:
        # EXIF extraction failed — cannot verify freshness from metadata
        pass

    now = datetime.utcnow()

    if exif_timestamp:
        age_hours = (now - exif_timestamp).total_seconds() / 3600

        if age_hours > 6:
            is_fresh = False
            flags.append('old_image')

        # Check if EXIF timestamp is wildly different from device_timestamp
        drift_hours = abs((exif_timestamp - device_timestamp).total_seconds()) / 3600
        if drift_hours > 2:
            flags.append('timestamp_mismatch')

    # Check if device_timestamp itself is old
    device_age_hours = (now - device_timestamp).total_seconds() / 3600
    if device_age_hours > 4:
        flags.append('late_submission')

    return {
        'is_fresh': is_fresh,
        'exif_timestamp': exif_timestamp,
        'device_timestamp': device_timestamp,
        'flags': flags
    }
```

### 6.4 Location Plausibility Check

```python
def check_location_match(lat: float, lon: float, claimed_zone_id: str) -> dict:
    """
    Checks that the submitted GPS coordinates fall within
    the claimed zone's polygon (or within a 5km buffer of it).
    """
    point_wkt = f"ST_SetSRID(ST_Point({lon}, {lat}), 4326)"

    # Check if point is inside zone polygon
    inside = db.query(f"""
        SELECT ST_Contains(geometry, {point_wkt}::geometry) as inside,
               ST_Distance(geometry::geography, {point_wkt}::geography) as distance_m
        FROM zones WHERE id = '{claimed_zone_id}'
    """)

    distance_m = inside[0]['distance_m']
    is_inside   = inside[0]['inside']

    # Allow up to 5km outside the zone boundary (GPS drift, adjacent zones)
    matches = is_inside or distance_m <= 5000

    flags = []
    if not is_inside and distance_m > 5000:
        flags.append('location_far_from_zone')
    if distance_m > 20000:
        flags.append('location_very_far')

    return {
        'matches': matches,
        'distance_m': distance_m,
        'is_inside_zone': is_inside,
        'flags': flags
    }
```

### 6.5 Duplicate Detection

```python
def check_duplicate(file_bytes: bytes) -> dict:
    """
    Generates a perceptual hash (pHash) of the image.
    Queries DB for any report submitted in the last 48 hours
    with a similar hash (Hamming distance < 10).
    """
    import imagehash
    from PIL import Image
    import io

    img  = Image.open(io.BytesIO(file_bytes))
    phash = str(imagehash.phash(img))

    # Query recent reports for similar hash
    recent = db.fetch_recent_report_hashes(hours=48)
    for r in recent:
        stored_hash   = imagehash.hex_to_hash(r['duplicate_hash'])
        current_hash  = imagehash.hex_to_hash(phash)
        hamming_dist  = stored_hash - current_hash

        if hamming_dist < 10:  # Very similar image
            return {
                'is_duplicate': True,
                'hash': phash,
                'duplicate_of': r['id'],
                'hamming_distance': hamming_dist
            }

    return {
        'is_duplicate': False,
        'hash': phash,
        'duplicate_of': None,
        'hamming_distance': None
    }
```

### 6.6 Verification Score Aggregation

```python
def aggregate_verification(results: dict) -> tuple[float, str, list]:
    """
    Combines all check results into a single verification_score
    and overall status decision.

    Returns: (score: float, status: str, flags: list)
    """
    flags = []
    score = 0.0

    vision   = results['vision']
    fresh    = results['freshness']
    location = results['location']
    dedup    = results['duplicate']

    # Instant FAIL conditions
    if dedup['is_duplicate']:
        return 0.0, 'duplicate', ['duplicate_submission']

    if vision['flagged_inappropriate']:
        return 0.0, 'fake', ['inappropriate_content']

    # Scoring weights
    if vision['is_relevant']:
        score += vision['relevance_score'] * 0.50    # Vision: 50% weight

    if fresh['is_fresh']:
        score += 0.25                                 # Freshness: 25% weight
    else:
        flags.extend(fresh['flags'])

    if location['matches']:
        score += 0.25                                 # Location: 25% weight
    else:
        flags.extend(location['flags'])
        score -= 0.10                                 # Penalty for location mismatch

    score = max(0.0, min(score, 1.0))

    # Status classification
    if score >= 0.75:
        status = 'verified'
    elif score >= 0.40:
        status = 'unverified'    # Needs human review
    else:
        status = 'fake'
        flags.append('low_confidence')

    return round(score, 3), status, flags
```

---

## 7. Risk Score Boost Integration

When a media report passes verification, it provides a small but meaningful boost to the zone's risk score to reflect ground-truth evidence.

```python
def apply_risk_boost(zone_id: str, verification_score: float, report_id: str):
    """
    Adds a capped boost to the zone's current risk score.
    Maximum boost: +0.15 (to prevent a single photo from forcing CRITICAL).
    Boost decays over 2 hours.
    """
    MAX_BOOST = 0.15
    boost = verification_score * MAX_BOOST

    current = redis.get(f'risk:{zone_id}')
    if current:
        data = json.loads(current)
        boosted_score = min(1.0, data['score'] + boost)

        redis.setex(
            f'risk:{zone_id}',
            7200,  # 2-hour TTL — boost expires
            json.dumps({
                **data,
                'score': boosted_score,
                'media_boost': boost,
                'media_report_id': report_id,
                'media_boost_expires_at': (datetime.utcnow() + timedelta(hours=2)).isoformat()
            })
        )

        # Broadcast updated score to dashboard via WebSocket
        socketio.emit('zone_risk_updated', {
            'zone_id': zone_id,
            'score': boosted_score,
            'source': 'media_report',
            'report_id': report_id
        })

    # Log boost in DB
    db.update_media_report(report_id, {'risk_boost_applied': True, 'risk_boost_amount': boost})
```

---

## 8. Dashboard UI Changes (P1)

A new panel appears in the zone detail sidebar when media reports exist for that zone:

```
┌─────────────────────────────────────────┐
│ 📷 Ground Reports — Joshimath Zone      │
│                                         │
│ ┌──────────────────────────────────┐    │
│ │ [thumbnail] ● Verified  0.87     │    │
│ │ 14 min ago · 30.55°N 79.56°E    │    │
│ │ "पहाड़ से पत्थर गिर रहे हैं"     │    │
│ │ [View Full Image] [Mark Reviewed] │    │
│ └──────────────────────────────────┘    │
│                                         │
│ ┌──────────────────────────────────┐    │
│ │ [thumbnail] ⏳ Pending           │    │
│ │ 3 min ago · 30.55°N 79.56°E     │    │
│ │ [View] [Verify] [Flag as Fake]   │    │
│ └──────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**Verification status badges:**

| Badge | Color | Meaning |
|-------|-------|---------|
| ● Verified | Green | AI confidence ≥ 0.75, passed all checks |
| ⏳ Pending | Yellow | AI verification in progress |
| ⚠ Unverified | Orange | Low AI confidence — needs human review |
| ✕ Fake/Duplicate | Red | Rejected by AI or DDMO |

---

## 9. Citizen PWA UI Changes (P2)

A new "Report" button appears on the main risk screen and safe zones screen.

**Upload screen design:**

```
┌─────────────────────────────────────────┐
│  📷 भूस्खलन की रिपोर्ट करें            │
│     Report a Landslide                  │
│                                         │
│  ┌────────────────────────────────────┐ │
│  │                                    │ │
│  │     [Camera Icon]                  │ │
│  │     फोटो या वीडियो लें             │ │
│  │     Take photo or video            │ │
│  │                                    │ │
│  └────────────────────────────────────┘ │
│                                         │
│  📍 आपकी लोकेशन: 30.5568°N, 79.5643°E  │
│     GPS accuracy: ±12m                  │
│                                         │
│  ┌────────────────────────────────────┐ │
│  │ क्या हो रहा है? (वैकल्पिक)          │ │
│  │ What's happening? (optional)        │ │
│  └────────────────────────────────────┘ │
│                                         │
│  [भेजें / Submit]                       │
│                                         │
│  ⚠ केवल वास्तविक आपदा रिपोर्ट करें।    │
│    Only report real emergencies.        │
└─────────────────────────────────────────┘
```

**Key UX rules for the upload screen:**
- Location must be auto-captured. If GPS is unavailable, show warning and disable submit button.
- Camera button opens the device camera directly (not gallery) to encourage fresh images.
- Gallery access is allowed but shows a prominent warning: "Gallery photos may not reflect current conditions."
- Submission confirmation shown in the citizen's selected language.
- No more than 3 uploads per phone number per hour (enforced server-side).

---

## 10. Privacy & Abuse Prevention

| Risk | Mitigation |
|------|-----------|
| False reports to trigger fake alerts | AI verification + DDMO human review before risk boost |
| Old archive photos submitted as current | EXIF timestamp check + device timestamp vs server time |
| Same image submitted multiple times | Perceptual hash dedup within 48-hour window |
| Malicious file uploads (malware, etc.) | File type validation + ClamAV antivirus scan before S3 storage |
| Privacy — photo contains people's faces | Google Vision safe search + blur face option in dashboard view |
| Phone number harvesting | Phone hash used for rate limiting, never stored in plaintext in media_reports |
| Abusive descriptions | Text moderation on description field (Google Perspective API or rule-based filter) |

---

## 11. Storage Architecture

- **Raw files:** AWS S3 bucket `hhlews-media-reports/` with server-side AES-256 encryption
- **Thumbnails:** AWS S3 bucket `hhlews-thumbnails/` — generated by Lambda on upload
- **Access:** Presigned URLs (15-minute expiry) for dashboard viewing — never public permanent URLs
- **Retention:** Raw files retained 1 year, then moved to S3 Glacier. Thumbnails retained 30 days.
- **GDPR/DPDP compliance:** User can request deletion of their media reports via the PWA unsubscribe flow

---

## 12. New Environment Variables Required

```bash
# Google Cloud Vision API
GOOGLE_CLOUD_PROJECT_ID=
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# AWS S3 for media storage
AWS_S3_MEDIA_BUCKET=hhlews-media-reports
AWS_S3_THUMBNAIL_BUCKET=hhlews-thumbnails
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-south-1

# File size limits
MAX_PHOTO_SIZE_MB=10
MAX_VIDEO_SIZE_MB=50
```

---

## 13. Implementation Checklist

- [ ] `media_reports` table created with all indexes
- [ ] `POST /api/reports/upload` endpoint accepting multipart/form-data
- [ ] S3 upload with antivirus scan and file type validation
- [ ] Celery `verify_media_report` task: Vision API + EXIF + location + dedup
- [ ] `aggregate_verification` scoring logic tested
- [ ] Risk boost integration with 2-hour TTL decay in Redis
- [ ] WebSocket `media_report_received` event to dashboard
- [ ] Dashboard media panel in zone sidebar (P1)
- [ ] PWA upload screen with camera access and GPS capture (P2)
- [ ] Rate limiting: 3 uploads per phone per hour
- [ ] Presigned URL generation for dashboard image viewing
- [ ] DDMO manual review endpoints (`POST /api/dashboard/reports/:id/review`)

---

*HH-LEWS Improvement Spec: Crowdsourced Media Evidence — v1.0*
