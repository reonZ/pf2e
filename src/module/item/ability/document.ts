import type { ActorPF2e } from "@actor";
import type { CraftingAbility } from "@actor/character/crafting/ability.ts";
import { ChatMessageMode } from "@client/config.mjs";
import type { DatabaseCreateCallbackOptions, DatabaseUpdateCallbackOptions } from "@common/abstract/_types.d.mts";
import { ItemPF2e } from "@item";
import type { ActionCost, Frequency, RawItemChatData } from "@item/base/data/index.ts";
import type { RangeData } from "@item/types.ts";
import { ChatMessagePF2e } from "@module/chat-message/document.ts";
import type { RuleElement, RuleElementOptions } from "@module/rules/index.ts";
import { EnrichmentOptionsPF2e } from "@system/text-editor.ts";
import { sluggify } from "@util";
import type { AbilitySource, AbilitySystemData } from "./data.ts";
import { getActionCostRollOptions, normalizeActionChangeData, processSanctification } from "./helpers.ts";
import type { AbilityTrait } from "./types.ts";
import { USE_ABILITY_OPTION } from "./values.ts";

class AbilityItemPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    declare range?: RangeData | null;

    declare isMelee?: boolean;

    /** If this ability can craft, what is the crafting ability */
    declare crafting?: CraftingAbility | null;

    /** If suppressed, this ability should not be visible on character sheets nor have rule elements */
    declare suppressed: boolean;

    static override get validTraits(): Record<AbilityTrait, string> {
        return CONFIG.PF2E.actionTraits;
    }

    get traits(): Set<AbilityTrait> {
        return new Set(this.system.traits.value);
    }

    get actionCost(): ActionCost | null {
        const actionType = this.system.actionType.value || "passive";
        if (actionType === "passive") return null;

        return {
            type: actionType,
            value: this.system.actions.value,
        };
    }

    get frequency(): Frequency | null {
        return this.system.frequency;
    }

    override prepareBaseData(): void {
        super.prepareBaseData();
        this.crafting = null;
    }

    override prepareActorData(): void {
        // Exit early if the ability is being suppressed
        if (this.suppressed) return;

        const actor = this.actor;
        if (actor?.isOfType("familiar") && this.system.category === "familiar") {
            const slug = this.slug ?? sluggify(this.name);
            actor.rollOptions.all[`self:ability:${slug}`] = true;
        }
    }

    override onPrepareSynthetics(this: AbilityItemPF2e<ActorPF2e>): void {
        processSanctification(this);
    }

    override getRollOptions(prefix = this.type, options?: { includeGranter?: boolean }): string[] {
        const rollOptions = super.getRollOptions(prefix, options);
        if (this.frequency || this.system.deathNote) {
            rollOptions.push(`${prefix}:frequency:limited`);
        }

        rollOptions.push(...getActionCostRollOptions(prefix, this));
        return rollOptions;
    }

    override async toMessage(
        event?: Maybe<PointerEvent>,
        { actualUse = false, create = true, data, mode }: AbilityToMessageOptions = {},
    ): Promise<ChatMessagePF2e | undefined> {
        // We don't want to double the work if we have nothing to add
        if (!actualUse) {
            return super.toMessage(event, { create, data, mode });
        }

        const message = await super.toMessage(event, { create: false, data, mode });
        if (!message) return undefined;

        const messageSource = message.toObject();
        const flags = messageSource.flags[SYSTEM_ID];
        // The ability was actually used and not simply sent to chat.
        if (actualUse && flags.origin?.rollOptions) {
            flags.origin.rollOptions.push(USE_ABILITY_OPTION);
        }

        if (!create) {
            message.updateSource(messageSource);
            return message;
        }

        return ChatMessagePF2e.create(messageSource, { renderSheet: false });
    }

    /** Overriden to not create rule elements when suppressed */
    override prepareRuleElements(options?: Omit<RuleElementOptions, "parent">): RuleElement[] {
        if (this.suppressed) return [];
        return super.prepareRuleElements(options);
    }

    override async getChatData(
        this: AbilityItemPF2e<ActorPF2e>,
        htmlOptions: EnrichmentOptionsPF2e = {},
    ): Promise<RawItemChatData> {
        return this.processChatData(htmlOptions, {
            ...this.system,
            traits: this.traitChatData(),
        });
    }

    protected override async _preCreate(
        data: DeepPartial<this["_source"]>,
        options: DatabaseCreateCallbackOptions,
        user: fd.BaseUser,
    ): Promise<boolean | void> {
        // In case this was copied from an actor, clear any active frequency value
        if (!this.parent) {
            if (this._source.system.frequency) {
                this.updateSource({ "system.frequency.value": _del });
            }
        }
        return super._preCreate(data, options, user);
    }

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DatabaseUpdateCallbackOptions,
        user: fd.BaseUser,
    ): Promise<boolean | void> {
        normalizeActionChangeData(this, changed);
        return super._preUpdate(changed, options, user);
    }
}

interface AbilityItemPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    readonly _source: AbilitySource;
    system: AbilitySystemData;
}

interface AbilityToMessageOptions {
    actualUse?: boolean;
    create?: boolean;
    mode?: ChatMessageMode;
    data?: { castRank?: number };
}

export { AbilityItemPF2e };
export type { AbilityToMessageOptions };
