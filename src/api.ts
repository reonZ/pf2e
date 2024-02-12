Object.defineProperties(window, {
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
