import React from 'react'
import { Layout, LayoutProps } from 'react-admin'
import AdminMenu from './AdminMenu'
import customAppbar from './components/CustomAppbar'

const AdminLayout = (props: LayoutProps) => (
  <Layout {...props} menu={AdminMenu} appBar={customAppbar} />
)

export default AdminLayout
