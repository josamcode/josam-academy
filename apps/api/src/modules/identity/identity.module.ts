import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../shared/database/database.module.js';
import { EmailProvider } from '../../shared/providers/email/email.provider.js';
import { SmsProvider } from '../../shared/providers/sms/sms.provider.js';
import { GoogleOAuthService } from './oauth/google-oauth.service.js';
import { RegistrationService } from './registration/registration.service.js';
import { AccessTokenService } from './tokens/access-token.service.js';
import { RefreshTokenService } from './tokens/refresh-token.service.js';

/**
 * `M01` Identity. `PH-1.3` opens it with the token layer; `PH-1.4` adds registration,
 * verification and reset on top, and `PH-1.5`/`PH-1.6` add the other two providers.
 */
@Module({
  imports: [DatabaseModule],
  providers: [
    AccessTokenService,
    RefreshTokenService,
    RegistrationService,
    GoogleOAuthService,
    EmailProvider,
    SmsProvider,
  ],
  exports: [
    AccessTokenService,
    RefreshTokenService,
    RegistrationService,
    GoogleOAuthService,
    SmsProvider,
  ],
})
export class IdentityModule {}
