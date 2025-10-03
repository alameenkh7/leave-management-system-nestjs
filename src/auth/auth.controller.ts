import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate user with email and password. Returns JWT token and user information.',
  })
  @ApiBody({
    type: LoginDto,
    description: 'Login credentials',
    examples: {
      employee: {
        summary: 'Employee Login',
        value: {
          email: 'rohit.singh@company.com',
          password: 'password123'
        }
      },
      manager: {
        summary: 'Manager Login',
        value: {
          email: 'priya.sharma@company.com',
          password: 'password123'
        }
      },
      hr: {
        summary: 'HR Manager Login',
        value: {
          email: 'amit.gupta@company.com',
          password: 'password123'
        }
      },
      admin: {
        summary: 'Admin Login',
        value: {
          email: 'admin@company.com',
          password: 'password123'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        access_token: {
          type: 'string',
          description: 'JWT access token',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        },
        employee: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
            name: { type: 'string', example: 'Rohit Singh' },
            email: { type: 'string', example: 'rohit.singh@company.com' },
            role: { type: 'string', example: 'employee', enum: ['employee', 'reporting_manager', 'hr_manager', 'admin'] },
            department: { type: 'string', example: 'Engineering' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid credentials' },
        error: { type: 'string', example: 'Unauthorized' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['email must be an email', 'password should not be empty']
        },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }
}