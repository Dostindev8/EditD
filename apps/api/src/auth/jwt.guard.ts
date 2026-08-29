import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import jwt from "jsonwebtoken";
import { getJwtPublicKey } from "./jwt-keys.js";
import { User, UserDocument } from "../users/user.schema.js";

export type AccessPayload = { sub: string; email: string; tv: number };

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(@InjectModel(User.name) private users: Model<UserDocument>) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const token = req.cookies?.lcs_access as string | undefined;
    if (!token) throw new UnauthorizedException("Sesión requerida");
    try {
      const payload = jwt.verify(token, getJwtPublicKey(), {
        algorithms: ["RS256"],
      }) as AccessPayload;
      const user = await this.users.findById(payload.sub).select("tokenVersion").lean();
      if (!user || user.tokenVersion !== payload.tv) {
        throw new UnauthorizedException("Sesión revocada");
      }
      req.user = payload;
      return true;
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException("Token inválido o expirado");
    }
  }
}
