const jwt = require("jsonwebtoken");

require("dotenv").config();


 async function userAuth(req,res,next)
{

    try{

        const token = req.headers.authorization.split(" ")[1]
    
        jwt.verify(token, process.env.TOKEN_SECRET_KEY);

        next();


    }
    catch(err)

    {
        return res.status(401).json({
            error : "invalid token?!?"
        })
    }

    

}

module.exports = userAuth;