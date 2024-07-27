import { MenuItem } from '@mui/material'

const AppMenuItem = (): JSX.Element => {
  const handleClick = (): void => {
    console.log('Click detected in external app')
    alert('Hello from the external app! (AppMenuItem)')
  }

  return <MenuItem onClick={handleClick}>App Menu Item 1</MenuItem>
}

export default AppMenuItem
