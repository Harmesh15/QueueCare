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
    }catch(err){
        next(err);
        return res.status(500).json({message:"User not created",error: err.message})
    }
}





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

            const attempts = await redisClient.incr(req.loginRateLimitKey);

              if (attempts === 1) {
               await redisClient.expire(req.loginRateLimitKey, 60);
             }

            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }
 

    const isPassMatched = await bcrypt.compare(password,user.password);

        if (!isPassMatched) {

            const attempts = await redisClient.incr(req.loginRateLimitKey);
            console.log('Failed login count:', attempts);

            if (attempts === 1) {
                await redisClient.expire(req.loginRateLimitKey, 60);
            }

            return res.status(401).json({
                message: 'Invalid email or password'
            });
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
