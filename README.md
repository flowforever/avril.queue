#avril.queue
avril.queue is an async flow control tool, it tries to ease the pain of callback. 

It's pretty simple to use. Let's rock.

##install avril.queue

```
npm install avril.queue
```

for now avril.queue only support node env, I would try to make it support the browsers later.

```
/*
assume that we have a file "the/path/of/file.txt"
the file content is :
1
2
3
*/
```

###  func, $await , $each
    
```js
var avQ = require('avril.queue');
var q = avQ();
     
/* return $AwaitData object */
var $fileContent = q.$await(fs.readFile, 'the/path/of/file.txt'
, function(err, fileContent){
  this.error(err);
  return fileContent;
});

/* convert the $awaitData' result , return a new $AwaitData object */
var $ids = $fileContent.convert(function($org){
  return $org.result().split('\n');
}); 

/*  return $AwaitData object which result is list of */
var $users = q.$each(db.User.findById, $ids, function(err, user){
  this.error(err);
  return user;
}); 

q.func(function(){
  console.log( $fileContent.result() )
  console.log( $users.realResult() );
});
```
	
###$$await &  $$each

```js
var avQ = require('avril.queue');
var q = avQ();

/* return $AwaitData object */
var $fileContent = q.$$await(fs.readFile, 'the/path/of/file.txt'); 

/* convert the $awaitData' result , return a new $AwaitData object */
var $ids = $fileContent.convert(function($org){
  return $org.result().split('\n');
}); 

/*  return $AwaitData object which result is list of */
var $users = q.$$each(db.User.findById, $ids); 

q.func(function(){
    console.log( $fileContent.result() )
  console.log( $users.realResult() );
});
```

###use $await, $each, with context

```js
var avQ = require('avril.queue');
var q = avQ();
   
/* return $AwaitData object */
var $fileContent = q.$await(fs, fs.readFile, 'the/path/of/file.txt'
, function(err, fileContent){
  this.error(err);
  return fileContent;
});

/* convert the $awaitData' result , return a new $AwaitData object */
var $ids = $fileContent.convert(function($org){
  return $org.result().split('\n');
}); 

/*  return $AwaitData object which result is list of */
var $users = q.$each(db.User, db.User.findById, $ids, function(err, user){
this.error(err);
  return user;
}); 

q.func(function(){
    console.log( $fileContent.result() )
  console.log( $users.realResult() );
});
```
