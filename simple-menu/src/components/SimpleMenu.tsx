import { MenuItem } from '@mui/material'

/**
 * TutorialMenuItemOne component:
 * This component creates a menu item that triggers an alert and closes the menu when clicked.
 *
 * Props:
 * - handleClose: A function from the parent component that will be called to close the menu.
 */

const SimpleMenu = (): JSX.Element => {
  /**
   * handleClick function:
   * This function is called when the menu item is clicked.
   * It shows an alert with a demo message and then calls the handleClose function to close the menu.
   */
  const handleClick = (): void => {
    // Trigger an alert window with a demo message
    alert('This is a demo of adding a menu item')
    // Call the handleClose function passed from the parent component
    // handleClose()
  }

  // Render a MenuItem component from Material-UI with the onClick event handler set to handleClick
  return <MenuItem onClick={handleClick}>Example Menu from App</MenuItem>
}

export default SimpleMenu
