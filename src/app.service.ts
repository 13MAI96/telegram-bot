import { Injectable } from '@nestjs/common'

@Injectable()
export class AppService {

  constructor(){
    this.getPublicIp()
  }

  getHello(): string {
    return 'Hello world!'
  }

  private getPublicIp = async () => {
  const req = await fetch("https://api.ipify.org?format=json");
  const res = await req.json()
  console.log(res.ip);
}
}
