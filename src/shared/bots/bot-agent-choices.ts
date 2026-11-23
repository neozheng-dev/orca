// Which agents a bot can run on a host, and whether each can start; the desktop's New bot and the
// host's own answer to a phone read it the same way.
import {
  agentMenuRowSupportsChat,
  type ChatUnavailableReason,
  type NewTabAgentMenuRow
} from '../agent-launch/picker/agent-launch-picker-rows'
import { BOT_AGENTS, type Bot, type BotAgent } from '../bot-types'

/** What these choices read of a host's agent menu; `detectedIds` is null when the check failed. */
export type BotAgentMenuModel =
  | { state: 'loading' }
  | {
      state: 'settled'
      rows: readonly NewTabAgentMenuRow[]
      detection: { detectedIds: readonly string[] | null }
    }

export type BotNewChatAgent = {
  agent: BotAgent
  /** Absent while it can start, or while the menu has not settled what this host offers. */
  unavailable?: ChatUnavailableReason
}

/** Whether `agent`'s chat can start here, as its agent row says. */
function botAgentOnHost(
  agent: BotAgent,
  model: Extract<BotAgentMenuModel, { state: 'settled' }>
): BotNewChatAgent {
  const own = model.rows.filter((entry) => entry.agent === agent)
  if (own.length === 0) {
    // No row: the agent is not on this host, or the host could not be asked.
    return {
      agent,
      unavailable: model.detection.detectedIds === null ? 'check-failed' : 'not-installed'
    }
  }
  // A bot runs a chat, so an unavailable chat row wins over the agent's CLI row wherever it sits.
  const unavailable = own.find((entry) => entry.kind === 'chat-unavailable')
  return unavailable ? { agent, unavailable: unavailable.reason } : { agent }
}

/** Whether the user has `agent` here: the menu's rows already leave out agents disabled in Agent
 *  settings; a chat that only offers to install the agent first doesn't count, nor does an
 *  unavailable chat for an agent this host doesn't have. */
function botAgentEnabledOnHost(
  agent: BotAgent,
  model: Extract<BotAgentMenuModel, { state: 'settled' }>
): boolean {
  return model.rows.some(
    (row) =>
      row.agent === agent &&
      (row.kind === 'chat-unavailable'
        ? model.detection.detectedIds?.includes(agent) === true
        : !(row.kind === 'chat' && row.setup))
  )
}

/** The bot's own agent first, then every other agent enabled here; each unavailable one says why,
 *  as agent rows do. When none of those can start, the bot's own agent as it stands here leads, so
 *  the list always offers it. Only the bot's own while the menu is still learning the host. */
export function botNewChatAgents(
  bot: Pick<Bot, 'agent'>,
  model: BotAgentMenuModel
): BotNewChatAgent[] {
  if (model.state === 'loading') {
    return [{ agent: bot.agent }]
  }
  const enabled = [bot.agent, ...BOT_AGENTS.filter((agent) => agent !== bot.agent)]
    .filter((agent) => botAgentEnabledOnHost(agent, model))
    .map((agent) => botAgentOnHost(agent, model))
    .filter((entry) => entry.unavailable !== 'not-installed')
  if (enabled.some((entry) => !entry.unavailable)) {
    return enabled
  }
  return [botAgentOnHost(bot.agent, model), ...enabled.filter((entry) => entry.agent !== bot.agent)]
}

/** The agents a bot can be set to here: the installed ones, and `current` always; empty while the
 *  menu is still learning the host. */
export function botAgentChoices(model: BotAgentMenuModel, current?: BotAgent): BotAgent[] {
  if (model.state === 'loading') {
    return current ? [current] : []
  }
  return BOT_AGENTS.filter(
    (agent) =>
      agent === current ||
      model.rows.some((row) => row.agent === agent && agentMenuRowSupportsChat(row))
  )
}
