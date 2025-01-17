const express = require('express'),
	  expressSanitizer = require('express-sanitizer'),
	  methodOvrd = require('method-override'),
	  app = express(),
	  axios = require('axios'),
	//   dotenv = require('dotenv'), //for debug purpose
	  mongoose = require('mongoose');

// #############################################################################
// Logs all request paths and method
app.use(function (req, res, next) {
  res.set('x-timestamp', Date.now())
  res.set('x-powered-by', 'cyclic.sh')
  console.log(`[${new Date().toISOString()}] ${req.ip} ${req.method} ${req.path}`);
  next();
});


// ####### config ->

// dotenv.config(); //debug
app.use(methodOvrd('_method'));
app.set('trust proxy', true);
app.set('view engine','ejs');
app.use(express.urlencoded({extended: true})); // changed this to true
app.use(expressSanitizer());
app.use(express.static("public"));


// #############################################################################
// This configures static hosting for files in /public that have the extensions
// listed in the array.
// var options = {
//   dotfiles: 'ignore',
//   etag: false,
//   extensions: ['htm', 'html','css','js','ico','jpg','jpeg','png','svg'],
//   index: ['index.html'],
//   maxAge: '1m',
//   redirect: false
// }
// app.use(express.static('public', options))

// ########### App code ->

const db = mongoose.connection;
mongoose.connect(process.env.MONGO_ACCESS_URI , {useNewUrlParser: true, useUnifiedTopology: true});

db.then(() => {
  console.log("MongoDB connected!");
})
.catch(err => console.log(err));

db.on('error', (err) => {
  console.log(err);
})
//Routes -->

const blogSchema = new mongoose.Schema({
	title: String,
	image: String,
	body: String,
	created: {type:Date, default: Date.now}
});

const Blog = mongoose.model('Blog',blogSchema);

app.get('/', (req,res) => {	
	res.redirect("/blogs");
});

// INDEX Route -->

app.get('/blogs',async (req,res)=>{
	
	try{
		const blogs = await Blog.find({});
		console.log("Page Visited!! ip: "+ req.ip);
		res.render('index',{blogs});
	}
	catch (err){
		console.log(err.message);
	}
	
});

// NEW -->

app.get('/blogs/new',(req,res)=>{
	res.render('new');
});

//CREATE Route -->

app.post('/blogs',(req,res)=>{
	
	req.body.blog.body = req.sanitize(req.body.blog.body);
	
	Blog.create(req.body.blog).then((dt)=>{
		res.redirect("/blogs");
		console.log("New Post Added");
		console.log(dt);
	}).catch((err) =>{
		console.log(err)
		res.redirect("/blogs/new");
	});

});

//SHOW Route -->

app.get('/blogs/:id',async (req,res)=>{
	
	try{
		const blog = await Blog.findById(req.params.id);
		res.render('show',{ blog });
	}
	catch(err){
		console.log(err);
		res.redirect("/");
	}
		
});

//UPDATE Route -->

app.get('/blogs/:id/edit', async (req,res)=>{

	try{
		const blog = await Blog.findById(req.params.id);
		res.render('edit',{ blog });
	}
	catch(err){
		console.log(err);
		res.redirect(`/blogs/${req.params.id}`);
	}
});

// Get post

app.put('/blogs/:id', async (req,res)=>{
	
	req.body.blog.body = req.sanitize(req.body.blog.body);
	
	try{
		const newdta = await Blog.findByIdAndUpdate(req.params.id, req.body.blog, { new:true });
		console.log("Post Updated!!");
		console.log(newdta);
		res.redirect('/blogs/'+req.params.id);
	}
	catch (err){
		console.log(err);
		res.redirect("/");
	}
});

 // DELETE Route -->

app.delete('/blogs/:id', async (req,res)=>{
	
	try{
		await Blog.findByIdAndDelete(req.params.id);
		console.log("Post Deleted!!");
		res.redirect("/");
	}
	catch (err){
		console.log(err);
		res.send("Post not delete. err");
	}
});

// Get weather -->

app.get('/weather', async (req,res)=>{
	
	try{
		res.render('weather');
	}
	catch(err){
		console.log(err);
		res.redirect(`/blogs`);
	}
});

// Listening Weather API requests-->

const weather = async (api) => {
    try {        
        return axios.get(api); // returns promise
    } catch (err) {
        console.log(err.message);
    }
}


app.get('/weather/:lat/:lon', async(req,res) => {
	try {
		const {lat, lon} = req.params;
		let api_url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${process.env.API_KEY}`;
		const { data } = await weather(api_url); //extracting only data component
		data.ip = req.ip; //adding ip value to the data object
		res.send(data);
		console.log("Weather fetched by ip: "+req.ip);
	} catch (err) {
		console.log(err.message);
	}
});

// #############################################################################
// Catch all handler for all other request.
app.use('*', (req,res) => {
  res.json({
      at: new Date().toISOString(),
      method: req.method,
      hostname: req.hostname,
      ip: req.ip,
      query: req.query,
      headers: req.headers,
      cookies: req.cookies,
      params: req.params
    })
    .end()
})

module.exports = app;