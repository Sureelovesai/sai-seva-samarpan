import { Body, Controller, Get, Post } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  hello() {
    return { message: 'Hello World!' };
  }

  @Get('users')
  getUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('users')
  createUser(@Body() body: { email: string; name?: string }) {
    return this.prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
      },
    });
  }
}