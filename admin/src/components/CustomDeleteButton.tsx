import React from 'react'
import { DeleteWithConfirmButton } from 'react-admin'

const CustomDeleteButton = () => {
  return (
    <DeleteWithConfirmButton
      label="Delete"
      sx={{
        backgroundColor: 'transparent',
        border: '1px solid transparent',
        fontWeight: 'bold',
        margin: '0 6px',
        ':hover': {
          backgroundColor: 'transparent',
        },
        ':only-child': {
          margin: '0 0',
        },
      }}
    />
  )
}

export default CustomDeleteButton
