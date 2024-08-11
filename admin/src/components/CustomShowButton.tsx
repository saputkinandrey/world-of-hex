import React from 'react'
import { ShowButton } from 'react-admin'

const CustomShowButton = () => {
  return (
    <ShowButton
      sx={{
        border: '1px solid transparent',
        color: 'grey',
        fontWeight: 'bold',
        margin: '0 6px',
        ':only-child': {
          margin: '0 0',
        },
      }}
      label="Show"
    />
  )
}

export default CustomShowButton
