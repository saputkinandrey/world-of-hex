import * as React from 'react'
import { Toolbar, AppBar, Typography } from '@mui/material'
import { SidebarToggleButton } from 'react-admin'

const CustomAppbar = () => {
  return (
    <AppBar
      sx={{
        backgroundColor: 'white',
        color: 'black',
        boxShadow: 'unset',
      }}
    >
      <Toolbar variant="dense">
        <SidebarToggleButton />
        <Typography id="react-admin-title" sx={{ marginLeft: '18px' }} />
      </Toolbar>
    </AppBar>
  )
}

export default CustomAppbar
