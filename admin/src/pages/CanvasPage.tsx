import React from 'react'
import {Paper, Toolbar} from "@mui/material";
import TwoWrapper from "../components/TwoWrapper";
import TextField from '@mui/material/TextField';

export const CanvasPage: React.FC = () => {

  return (
    <>
      <Toolbar></Toolbar>
      <Paper style={{ padding: 16 }} elevation={2}>
          <div style={{display:"flex", flexDirection:'row', alignItems: 'center'}}>
              <div style={{
                  width: '256px',
                  display: "flex",
                  flexDirection: 'row',
                  alignItems: "baseline",
                  justifyContent: 'space-around'
              }}>
                  <h2> Canvas </h2>
                  <TextField style={{width:'50px'}} id="standard-basic" label="Height" variant="outlined"/>
                  <span>X</span>
                  <TextField style={{width:'50px'}} id="standard-basic" label="Width" variant="outlined"/>
              </div>
          </div>

          <TwoWrapper/>

      </Paper>
    </>
  )
}
