import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import { HelloHeader } from './HelloHeader'
import { LayoutSection } from './LayoutSection'
import { SelectionSection } from './SelectionSection'
import { VisualStyleSection } from './VisualStyleSection'

const HelloPanel = (): JSX.Element => (
  <Box
    sx={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '1em',
      gap: 2,
      overflowY: 'auto',
    }}
  >
    <HelloHeader />
    <Divider />
    <VisualStyleSection />
    <Divider />
    <SelectionSection />
    <Divider />
    <LayoutSection />
  </Box>
)

export default HelloPanel
