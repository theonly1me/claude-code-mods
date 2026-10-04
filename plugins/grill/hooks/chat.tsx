import type { On } from 'claude-code'

import { addChatMessage, grillView, queueShare } from './grill/state'

export const CHAT_PANE = 'grill-chat'
const PARTNER = '#facc15'
const YOU = '#7dd3fc'

export function installChat(on: On): void {
  on('ui.render', { component: 'Pane', requestId: CHAT_PANE }, async ($, e) => {
    if (e.surface === 'mobile') {
      const { Text } = $.ui.resolve(e)
      return <Text dimColor>The side chat needs the terminal or the desktop app.</Text>
    }
    const { Box, Text, Input, Button } = $.ui.resolve(e)
    const { chat, isChatThinking, lastTask } = grillView()
    const room = Math.max(4, (e.viewport?.rows ?? 30) - 10)
    return (
      <Box flexDirection="column">
        <Text>
          <Text bold>Side chat</Text>
          <Text dimColor>  Claude does not see this until you share it.</Text>
        </Text>
        {lastTask !== '' && <Text dimColor italic>{`Claude is on: ${lastTask.slice(0, 120)}`}</Text>}
        <Box flexDirection="column" marginY={1}>
          {chat.length === 0 && (
            <Text dimColor>Think out loud about the task, a design, or anything else. Your partner answers here.</Text>
          )}
          {chat.slice(-room).map(message => (
            <Text>
              <Text bold color={message.role === 'you' ? YOU : PARTNER}>{message.role === 'you' ? 'you      ' : 'partner  '}</Text>
              {message.text}
            </Text>
          ))}
          {isChatThinking && <Text color={PARTNER}>partner  thinking…</Text>}
        </Box>
        <Input
          key="message"
          autoFocus
          placeholder="Say something and press Enter"
          onSubmit={value => {
            if (value.trim() === '') {
              return
            }
            addChatMessage({ role: 'you', text: value.trim() })
            $.ui.invalidate('ui.render')
          }}
        />
        <Box flexDirection="row" columnGap={2} marginTop={1}>
          <Button
            key="share"
            hotkey="s"
            label="Share with Claude"
            variant="primary"
            onPress={() => {
              queueShare()
              $.ui.toast('Writing notes from this chat into your prompt')
            }}
          />
        </Box>
      </Box>
    )
  })
}
