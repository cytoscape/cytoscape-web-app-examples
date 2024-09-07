import React from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'

interface MessageDialogProps {
  open: boolean
  onClose: () => void
  message: string
}

const MessageDialog: React.FC<MessageDialogProps> = ({
  open,
  onClose,
  message,
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Simple Menu App</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default MessageDialog
