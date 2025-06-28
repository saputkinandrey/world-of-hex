import {Controller, Get, Route} from "tsoa"

@Route()
export class AppController extends Controller {

  @Get()
  public async healthCheck(): Promise<{ message: string, timestamp: string}> {
    return {
      message: 'OK',
      timestamp: Date.now().toString(),
    }
  }
}
