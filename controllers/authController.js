const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const redisClient = require('../config/redis');


exports.register = async (req,res,next)=>{
    console.log("register controller hit")

    try{
         const {name,email,password} =  req.body;

          if(!name || !email || !password){
             return res.status(400).json({
                message: 'Name, email and password are required'
            });
          }
   
    const existingUser = await User.findOne({email});
    console.log(existingUser);
      if(existingUser) {
            return res.status(409).json({
                message: 'User already exists'
         });
      }     

      console.log("after existing if condition");
   const hashedPass = await bcrypt.hash(password,12);

 const user = await User.create({
            name,
            email,
            password: hashedPass
    });
      res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
   } catch (err) {
    next(err);
}
}








const recordFailedLogin = async (req, res) => {
    const key = req.loginRateLimitKey;

    const attempts = await redisClient.incr(key);

    // First failed attempt par counter ki expiry set karo.
    if (attempts === 1) {
        await redisClient.expire(key, 60);
    }

    // Fifth consecutive failure par fresh 60-second lockout.
    if (attempts >= 5) {
        await redisClient.expire(key, 60);

        const ttl = await redisClient.ttl(key);

        return res.status(429).json({
            message: "Too many failed login attempts. Please wait.",
            locked: true,
            remainingAttempts: 0,
            remainingSeconds: Math.max(ttl, 0)
        });
    }

    return res.status(401).json({
        message: "Invalid email or password",
        attempts,
        remainingAttempts: 5 - attempts,
        locked: false
    });
};




/// User login

exports.login = async (req,res,next)=>{
    try{
        const {email,password} = req.body;

       if (!email || !password) {
            return res.status(400).json({
                message: 'Email and password are required'
            });
        }

        const user = await User.findOne({email});

        if (!user) {
               return await recordFailedLogin(req, res);
           }
 

    const isPassMatched = await bcrypt.compare(password,user.password);

        if (!isPassMatched) {

             return await recordFailedLogin(req, res);

            // const attempts = await redisClient.incr(req.loginRateLimitKey);
            // console.log('Failed login count:', attempts);

            // if (attempts === 1) {
            //     await redisClient.expire(req.loginRateLimitKey, 60);
            // }

            // return res.status(401).json({
            //     message: 'Invalid email or password'
            // });
        }


      const token = jwt.sign(
            {
                userId: user._id,
                role: user.role
            },
            process.env.JWT_SECRET,

            { expiresIn: '1h' }
        );

        // Reset failed login attempts after successful login
           await redisClient.del(req.loginRateLimitKey);

         res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    }catch(err){
        next(err)
    }
}
