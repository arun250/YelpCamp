if( process.env.NODE_ENV !== "production"){
    require('dotenv').config();
}

const express  = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const Joi = require('joi');
const {campgroundSchema, reviewSchema} = require('./schemas.js');
// const catchAsync = require('./utils/catchAsync');
const ExpressError = require('./utils/ExpressError');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local'); 
const User = require('./models/user')
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize')
// const Campground = require('./models/campground');
// const Review = require('./models/review');
const userRoutes = require('./routes/users')
const campgroundRoutes = require('./routes/campground');
const reviewRoutes = require('./routes/reviews');
const MongoStore = require('connect-mongo')(session);
// const dburl = process.env.DB_URL;
const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/yelpcamp';
const { deserializeUser } = require('passport');
mongoose.connect(dbUrl, {useNewUrlParser: true, useUnifiedTopology: true});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", ()=>{console.log(" Database connected")});
const app = express();
app.engine('ejs', ejsMate)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname,'views'));

app.use(express.urlencoded({extended : true}));
app.use(methodOverride('_method'));
app.use(mongoSanitize({
    replaceWith: '_'
}));
app.use(express.static(path.join(__dirname,'public')));
const secret = process.env.SECRET || 'thisshouldbeabettersecret'
const store = new MongoStore({
    url: dbUrl,
    secret,
    touchAfter: 24 * 60 * 60
})

store.on("error", function(e){
    console.log("session store error",e);
})
const sessionConfig ={
    store,
    name: "session",
    secret,
    resave : false,
    saveUninitialized : true,
    cookie :{
        httpOnly : true,

        expires: Date.now() + 1000 *60 *60 *24 * 7,
        maxAge : 1000 *60 *60 *24 * 7
    }
}
app.use(session(sessionConfig));
app.use(flash());
app.use(helmet({contentSecurityPolicy : false}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());








app.use((req,res,next) =>{
       res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})


app.get('/fakeUser', async(req, res)=>{
    const user = new User({email: 'dogfight@gmail.com', username : 'dogfight'})
    const newUser = await User.register(user, 'dogfight');
    res.send(newUser);
})





// const ValidateCampground =(req,res,next) =>{
    
//     const {error} = campgroundSchema.validate(req.body);
//     if(error){
//         const msg = error.details.map(el => el.message).join(',')
//         throw new ExpressError(msg, 400);
//     }
//     else
//     {
//         next();
//     }
//     }
 
//     const validateReview =(req,res,next) =>{
    
//         const {error} = reviewSchema.validate(req.body);
//         if(error){
//             const msg = error.details.map(el => el.message).join(',')
//             throw new ExpressError(msg, 400);
//         }
//         else
//         {
//             next();
//         }
//         }
app.use('/',userRoutes);
app.use('/campgrounds',campgroundRoutes)
app.use('/campgrounds/:id/reviews', reviewRoutes)


app.get('/', (req, res)=>{
    res.render('home');
})
// app.get('/campgrounds', async(req, res)=>{
//     const campgrounds = await Campground.find({});
//     res.render('campgrounds/index',{campgrounds});
// })
// app.get('/campgrounds/new', (req,res) =>{
//     res.render('campgrounds/new');
// })
// app.post('/campgrounds',ValidateCampground, catchAsync(async(req,res,next) =>{
//     // if(!req.body.campground) throw new ExpressError('Invalid Campground Data', 400);
//         const campground =  new Campground(req.body.campground);
//         await campground.save();    
//         res.redirect(`/campgrounds/${campground._id}`);
//  }))

// app.get('/campgrounds/:id',catchAsync(async(req, res)=>{
// const campground = await Campground.findById(req.params.id).populate('reviews');
// res.render('campgrounds/show',{campground});
// }))

// app.get('/campgrounds/:id/edit', catchAsync(async (req,res)=>{
//     const campground = await Campground.findById(req.params.id);
// res.render('campgrounds/edit',{campground});
// }))
// app.put('/campgrounds/:id',ValidateCampground,catchAsync(async(req,res)=>{
//     const {id} = req.params;
//     const campground = await Campground.findByIdAndUpdate(id, {...req.body.campground})
//     res.redirect(`/campgrounds/${campground._id}`)
// }));

// app.delete('/campgrounds/:id', catchAsync(async(req,res)=>{
//     const {id} = req.params;
//      await Campground.findByIdAndDelete(id);
//     res.redirect('/campgrounds');
// }));

// app.post('/campgrounds/:id/reviews',validateReview, catchAsync(async(req,res)=>{
//     const campground = await Campground.findById(req.params.id);
//     const review = new Review(req.body.review);
//     campground.reviews. push(review);
//     await review.save();
//     await campground.save();
//     res.redirect(`/campgrounds/${campground._id}`);
// }));
// app.delete('/campgrounds/:id/reviews/:reviewId', catchAsync(async(req,res)=>{
//     const {id, reviewId} = req.params;
//     Campground.findByIdAndUpdate(id, {$pull : {reviews: reviewId}});
//     await Review.findByIdAndDelete(req.params.reviewId);
//     res.redirect(`/campgrounds/${id}`);
//     }));

app.all('*',(req,res,next)=>{
    next(new ExpressError('Page not found', 404))
})


app.use((err, req, res, next) =>{
    const {statusCode = 500} = err;
     if(!err.message) err.message ='Oh no, Something went wrong'
    res.status(statusCode).render('error',{err});
})

const port = process.env.PORT || 3000;
app.listen(port,()=>
{console.log(`serving on port${port}`)
})







