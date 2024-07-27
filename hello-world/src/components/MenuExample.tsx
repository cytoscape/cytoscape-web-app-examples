import { MenuItem } from '@mui/material'

const MenuExample = (): JSX.Element => {
  const handleClick = (): void => {
    alert('Hello from the external app!')
  }

  return <MenuItem onClick={handleClick}>Example Menu from App</MenuItem>
}

export default MenuExample
