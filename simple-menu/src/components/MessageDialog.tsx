import React from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import { Box } from '@mui/material'

interface MessageDialogProps {
  open: boolean
  onClose: () => void
  title: string
  message: string
  linkText?: string
  linkUrl?: string
}

const MessageDialog: React.FC<MessageDialogProps> = ({
  open,
  onClose,
  title,
  message,
  linkText,
  linkUrl,
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          <Box sx={{ p: '1em' }}>{message}</Box>
          <Box sx={{ p: '1em' }}>
            {linkText && linkUrl && (
              <>
                {' '}
                <a href={linkUrl} target="_blank" rel="noopener noreferrer">
                  {linkText}
                </a>
              </>
            )}
          </Box>
        </DialogContentText>
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
