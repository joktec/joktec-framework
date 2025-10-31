import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ExpressRequest, GeoIp, UserAgent } from '../../models';
import { JwtPayload } from '../../modules';

export enum GatewayContext {
  HTTP,
  GQL,
}

export const Jwt = createParamDecorator<GatewayContext, JwtPayload>(
  (data: GatewayContext, context: ExecutionContext): JwtPayload => {
    const ctx = data === GatewayContext.GQL ? GqlExecutionContext.create(context) : context;
    const req = ctx.switchToHttp().getRequest<ExpressRequest>();
    return req.payload;
  },
);

export const LoggedUser = createParamDecorator<GatewayContext, any>(
  (data: GatewayContext, context: ExecutionContext): any => {
    const ctx = data === GatewayContext.GQL ? GqlExecutionContext.create(context) : context;
    const req = ctx.switchToHttp().getRequest<ExpressRequest>();
    return req.loggedUser;
  },
);

export const Ip = createParamDecorator<GatewayContext, GeoIp>(
  (data: GatewayContext, context: ExecutionContext): GeoIp => {
    const ctx = data === GatewayContext.GQL ? GqlExecutionContext.create(context) : context;
    const req = ctx.switchToHttp().getRequest<ExpressRequest>();
    return req.geoIp;
  },
);

export const UA = createParamDecorator<GatewayContext, UserAgent>(
  (data: GatewayContext, context: ExecutionContext): UserAgent => {
    const ctx = data === GatewayContext.GQL ? GqlExecutionContext.create(context) : context;
    const req = ctx.switchToHttp().getRequest<ExpressRequest>();
    return req.userAgent;
  },
);

export const Locale = createParamDecorator<GatewayContext, string>(
  (data: GatewayContext, context: ExecutionContext): string => {
    const ctx = data === GatewayContext.GQL ? GqlExecutionContext.create(context) : context;
    const req = ctx.switchToHttp().getRequest<ExpressRequest>();
    return req.locale;
  },
);

export const Timezone = createParamDecorator<GatewayContext, string>(
  (data: GatewayContext, context: ExecutionContext): string => {
    const ctx = data === GatewayContext.GQL ? GqlExecutionContext.create(context) : context;
    const req = ctx.switchToHttp().getRequest<ExpressRequest>();
    return req.timezone;
  },
);
