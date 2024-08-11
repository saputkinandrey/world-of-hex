import React from 'react'
import { EditButton } from 'react-admin'

interface CustomEditButtonProps {
  callToAction?: boolean
}

const CustomEditButton = ({ callToAction }: CustomEditButtonProps) => {
  if (callToAction) {
    return (
      <EditButton
        sx={{
          border: '1px solid transparent',
          color: 'white',
          fontWeight: 'bold',
          margin: '0 6px',
          ':only-child': {
            margin: '0 0',
          },
        }}
        label="Redigera"
      />
    )
  } else {
    return (
      <EditButton
        sx={{
          backgroundColor: 'white',
          fontWeight: 'bold',
          ':hover': {
            backgroundColor: 'white',
          },
        }}
        label="Edit"
      />
    )
  }
}

export default CustomEditButton
