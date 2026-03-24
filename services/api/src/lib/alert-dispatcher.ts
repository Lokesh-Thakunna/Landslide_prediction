import twilio from "twilio";
import { AlertLog, Channel, Subscription } from "@bhurakshan/contracts";
import { env } from "../config/env";

const normalizePhoneNumber = (value: string) => value.replace(/\s+/g, "");

const formatTwilioAddress = (channel: Channel, value: string) => {
  const normalized = normalizePhoneNumber(value);
  const withoutWhatsappPrefix = normalized.replace(/^whatsapp:/i, "");

  if (channel === "WHATSAPP") {
    return `whatsapp:${withoutWhatsappPrefix}`;
  }

  return withoutWhatsappPrefix;
};

export class AlertDispatcher {
  public async dispatch(
    alert: AlertLog,
    subscribers: Subscription[]
  ): Promise<{
    deliveryStatus: AlertLog["deliveryStatus"];
    recipientCount: number;
  }> {
    if (
      !env.twilioAccountSid ||
      !env.twilioAuthToken ||
      (!env.twilioSmsFrom && !env.twilioWhatsappFrom)
    ) {
      return {
        deliveryStatus: "SIMULATED" as AlertLog["deliveryStatus"],
        recipientCount: subscribers.length
      };
    }

    const client = twilio(env.twilioAccountSid, env.twilioAuthToken);
    const targetedSubscribers = subscribers.filter((subscriber) =>
      subscriber.channels.some((channel) => alert.channels.includes(channel))
    );
    const localizedBodyByLanguage = Object.fromEntries(
      alert.localizedMessages.map((item) => [
        item.language,
        {
          SMS: item.smsBody,
          WHATSAPP: item.whatsappBody
        }
      ])
    );
    const deliveries = targetedSubscribers.flatMap((subscriber) =>
      subscriber.channels
        .filter((channel) => alert.channels.includes(channel))
        .map(async (channel: Channel) => {
        const to = formatTwilioAddress(channel, subscriber.phoneNumber);
        const fromRaw =
          channel === "WHATSAPP" ? env.twilioWhatsappFrom : env.twilioSmsFrom;
        const from = fromRaw ? formatTwilioAddress(channel, fromRaw) : undefined;

        if (!from) {
          return { ok: false };
        }

        const localizedChannelBodies =
          localizedBodyByLanguage[subscriber.alertLanguage] ??
          localizedBodyByLanguage[subscriber.appLanguage] ??
          localizedBodyByLanguage.hi;
        const body =
          localizedChannelBodies?.[channel] ??
          `${alert.zoneName}: ${alert.riskLevel} risk. Move to the nearest shelter if advised.`;

        await client.messages.create({
          to,
          from,
          body
        });

        return { ok: true };
        })
    );

    const settled = await Promise.allSettled(deliveries);
    const successCount = settled.filter(
      (item) => item.status === "fulfilled" && item.value.ok
    ).length;
    const failures = settled.filter((item) => item.status === "rejected");
    const failureMessages = failures.map((failure) =>
      failure.status === "rejected"
        ? failure.reason instanceof Error
          ? failure.reason.message
          : String(failure.reason)
        : ""
    );

    let deliveryStatus: AlertLog["deliveryStatus"] = "FAILED";

    if (!settled.length) {
      deliveryStatus = "DELIVERED";
    } else if (successCount === settled.length) {
      deliveryStatus = "DELIVERED";
    } else if (successCount > 0) {
      deliveryStatus = "PARTIAL";
    }

    if (failures.length) {
      console.warn(
        `[alert-dispatcher] ${failures.length} delivery attempt(s) failed.`,
        failureMessages.slice(0, 3)
      );
    }

    if (env.nodeEnv !== "production" && failures.length === settled.length) {
      console.warn(
        "[alert-dispatcher] Falling back to simulated delivery because all live provider attempts failed in non-production."
      );
      return {
        deliveryStatus: "SIMULATED",
        recipientCount: targetedSubscribers.length
      };
    }

    return {
      deliveryStatus,
      recipientCount: targetedSubscribers.length
    };
  }
}
