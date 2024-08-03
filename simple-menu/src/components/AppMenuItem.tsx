import { MenuItem } from '@mui/material'

interface AppMenuItemProps {
  title: string
  handleClose?: () => void
}

/**
 * Actual menu item component that will be rendered in the host app.
 *
 * @param param
 * @returns
 */
const AppMenuItem = ({
  title = 'Simple Menu Example',
}: AppMenuItemProps): JSX.Element => {
  const handleClick = (): void => {
    console.log('Click detected in external app')
    alert('Hello from the external app! (AppMenuItem)')
  }

  return <MenuItem onClick={handleClick}>{title}</MenuItem>
}

export default AppMenuItem
