/**
 * BridgePanel — placeholder observer panel.
 *
 * In Phase 3 this will subscribe to claude:connected, claude:command,
 * claude:result, and claude:error events to display a live command log.
 * For now it shows a static "Not connected" status.
 */
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

const BridgePanel = (): JSX.Element => (
  <Box
    sx={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      padding: '2em',
    }}
  >
    <Typography variant="h6" color="text.secondary">
      Claude Bridge
    </Typography>
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          bgcolor: 'grey.400',
        }}
      />
      <Typography variant="body2" color="text.secondary">
        Not connected
      </Typography>
    </Box>
    <Typography
      variant="caption"
      color="text.disabled"
      textAlign="center"
      sx={{ maxWidth: 280 }}
    >
      Start the MCP bridge server to connect Claude Code to this Cytoscape Web
      instance.
    </Typography>
  </Box>
)

export default BridgePanel
