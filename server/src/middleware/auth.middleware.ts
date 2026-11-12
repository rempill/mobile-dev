import type {Request, Response, NextFunction} from 'express';
import jwt from 'jsonwebtoken';
import type { AuthenticatedUser } from '../types/item.types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'pitstop_jwt_secret_dev_key_2026';

// extend express request interface to include auth'd user
declare global{
    namespace Express{
        interface Request{
            user?:AuthenticatedUser;
        }
    }
}

export const authToken=(req: Request, res: Response, next: NextFunction): void =>{
    const authHeader=req.headers['authorization'];
    const token=authHeader && authHeader.split(' ')[1]; // bearer tkn

    if(!token){
        res.status(401).json({error: 'Unauthorized: Auth token is missing.'});
        return;
    }

    jwt.verify(token,JWT_SECRET,(err,decoded)=>{
        if(err || !decoded){
            res.status(403).json({error: 'Forbidden: Invalid or expired token.'});
            return;
        }

        req.user=decoded as AuthenticatedUser;
        next();
    });
};

export const generateToken=(user:AuthenticatedUser): string => {
    return jwt.sign(user,JWT_SECRET,{expiresIn:'7d'});
}