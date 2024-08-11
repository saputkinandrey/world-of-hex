import React from 'react'
import { MenuItemLink, Menu } from 'react-admin'

type Links = {
  label: string
  path: string
}[]

const navItems: Links = [
  {
    label: 'Textures',
    path: '/textures',
  },
]

const AdminMenu = () => {

  return (
    <Menu
      sx={{
        height: '100vh',
        marginTop: '0',
        marginBottom: '0',
        paddingTop: '0',
        paddingBottom: '0',
        position: 'static',
      }}
    >
      <div>
        <div >
          {navItems.map(({ label, path }) => {
            return (
              <MenuItemLink
                key={label}
                primaryText={label}
                sx={{
                    backgroundColor: 'lightgreen',
                  width: '100%',
                  fontSize: '18px',
                  cursor: 'pointer',
                }}
                to={path}
              />
            )
          })}
        </div>
      </div>
    </Menu>
  )
}

export default AdminMenu
