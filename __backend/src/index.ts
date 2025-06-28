import '../env'
import {app} from "./app"
import {AppDataStore} from './db'

AppDataStore.initialize()
  .catch((error) => console.log(error))

const port = process.env.PORT || 4000

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`)
})
