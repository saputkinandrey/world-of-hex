import React from 'react'
import { SaveButton, Toolbar } from 'react-admin'

const CustomSaveButton = () => {
  return (
    <Toolbar>
      <SaveButton
        icon={<></>}
        sx={{
          border: '1px solid transparent',
          color: 'white',
          fontWeight: 'bold',
          margin: '0 6px',
        }}
        label="Save"
      />
    </Toolbar>
  )
}

export default CustomSaveButton
