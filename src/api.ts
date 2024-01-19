import { ChatMessagePF2e } from "@module/chat-message/document.ts";
import { DamageRoll } from "@system/damage/roll.ts";

Object.defineProperties(window, {
    ChatMessagePF2e: {
        value: ChatMessagePF2e,
        writable: false,
        configurable: false,
        enumerable: false,
    },
    DamageRoll: {
        value: DamageRoll,
        writable: false,
        configurable: false,
        enumerable: false,
    },
    pf2eApi: {
        value: {
            rules: await import("@module/rules/helpers.ts"),
            degreeOfSuccess: await import("@system/degree-of-success.ts"),
            chatMessage: await import("@module/chat-message/helpers.ts"),
        },
        writable: false,
        configurable: false,
        enumerable: false,
    },
});
