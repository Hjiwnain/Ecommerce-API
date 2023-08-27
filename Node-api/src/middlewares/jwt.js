import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

//MiddleWare to verify the JWT Token
function verifyToken(req,res,next){
    const bearHead = req.headers['authorization'];

    if(!bearHead){
        return res.status(404).json({message : "No JWT Token Provided"});
    }
    const token = bearHead.split(" ")[1];
    const secret = process.env.JWT_TOEKN_SECRET
    jwt.verify(token, secret,(err,authData) => {
        if(err){
            if(err.name == 'TokenExpiredError'){
                return res.status(401).json({message: 'Token Has Expired.'});
            }else{
                return res.status(403).json({message: 'Token is not valid.'});
            }
        }
        req.authData = authData;
        next();
    });
}

//getUserName from Bearer Token
function getUsername(authHeader) {
    console.log(authHeader);
    const token = authHeader.split(" ")[1];
    const decodedToken = atob(token.split(".")[1]);
    const parsedToken = JSON.parse(decodedToken);
    console.log(parsedToken);
    return parsedToken['userId'];
}

export {verifyToken,getUsername};