/**
 * Created by trump on 14-11-22.
 */
(function(module) {

    var guid = function(){
            return Date.now() + '_' + parseInt( 10000 * Math.random() )
        }
        , isFunction = function(obj) {
            return typeof obj === 'function';
        }
        , isArray= function (obj) {
            return obj instanceof Array;
        }
        , nameId = function(name){
            return [name ,  guid()].join('-');
        }
        , simpleCounter = function(total,callback){
            if(!(this instanceof  simpleCounter)){
                return new simpleCounter(total,callback);
            }

            var _total = total;
            var _count = 1;
            var _execResult = [];
            this.count = function(){
                _execResult.push(arguments);
                if(_count == _total){
                    callback( _execResult );
                }
                _count++;
            };
        };

    function $AwaitData(queue, key) {
        var self = this;
        var error
            , getRealResult = function($awaitObj) {
                if($awaitObj instanceof $AwaitData){
                    var result = $awaitObj.result();
                    for(var k in result){
                        result[k] = getRealResult(result[k]);
                    }
                    return result;
                }
                return $awaitObj;
            };

        this.key = key;
        this.queue = queue;
        this.isDone = false;

        this.error = function(err){
            this.queue.error(err);
            if(arguments.length == 1){
                error = err;
            }else{
                return error;
            }
        };

        this.result = function(value) {
            if(arguments.length == 1){
                this.queue.data(this.key, value);
            }
            this.isDone = true;
            return this.queue.data(this.key);
        };

        this.realResult = function(){
            return getRealResult(this);
        };

        this.conver = function(valueConverFunc) {
            var key = nameId('anonymous-data-');
            var $anonymousData = new $AwaitData(this.queue, key);
            valueConverFunc = valueConverFunc || function($org){ return $org.result(); }
            var counter = 0;
            var orgResultMethod = $anonymousData.result;

            $anonymousData.result = function() {
                if(counter++ == 0){
                    orgResultMethod.call($anonymousData, valueConverFunc(self) )
                }
                return orgResultMethod.apply($anonymousData, arguments);
            }

            return $anonymousData;
        }

    }

    function Queue(name) {
        var self = this
            , queue = []
            , parallers = []
            , data = {}
            , getArgArray = function(arg){
                return Array.prototype.slice.call(arg);
            }
            , _currentTask
            , _stop = false
            ;

        var getLastParalWrapper = function(){
            return parallers[parallers.length - 1];
        };
        var breakParal = function(){
            parallers.push(null);
        };
        var pickNext = function(){
            var task = queue[0];
            if(task){
                task.id = nameId('task');
                var fn =task.fn;
                if(!task.status){
                    _currentTask = task;
                    task.status = 'doing';
                    var subQueue = new Queue();
                    subQueue.parent = self;
					subQueue._pid = self.id;
                    var _next = function() {
                        if(task.status === 'done'){
                            return false;
                        }
                        task.status = 'done';
                        queue.shift();
                        if(subQueue.length()>0){
                            subQueue.func(pickNext);
                        }else{
                            pickNext();
                        }
                    };
                    if(!task.paralId){
                        !_stop && fn.call(subQueue, _next, task);
                    }else{
                        var counter = simpleCounter(fn.length, _next);
                        for(var i=0; i< fn.length;i++){
                            wrapFn(fn[i]).call(subQueue,function(){ !_stop && counter.count() }, task );
                        }
                    }
                }
            }else{
                _currentTask = null;
            }
        };
        var wrapFn = function(fn){
            if(fn.length >0){
                return fn;
            }
            return function(cb){
                fn.call(this);
                cb();
            }
        };

        this.id = nameId('q');

        this.name = name;

        this.getCurrentTask = function() {
            return _currentTask;
        }

        this.func = function(fn) {
            var paralWraper = getLastParalWrapper();
            if(paralWraper){
                paralWraper.exec();
            }
            if(arguments.length == 1){
                queue.push({ fn: wrapFn(fn) } );
                pickNext();
            } else if( arguments.length > 1){
                // param calls
                queue.push({ fn: arguments, paralId: nameId('paral') })
            }
            return this;
        };

        this.stop = function() {
            _stop = true;
            //clear current queue
            queue.splice(0);
        };

        this.error = function(err) {
            if(arguments.length == 0){
                return this._error;
            }
            if(err){
                this._error = err;
                this.onError();
            }
        };

        var _onError = function() {
            this.parent && this.parent.error(this._error);
        };

        this.onError = function(handler){
            if(arguments.length == 1){
                _onError = handler;
            }else{
                 _onError.call(this);
            }
        };

        this.insertFunc = function(currentTask, func) {
            if(arguments.length == 1){
                func = currentTask;
                currentTask = this.getCurrentTask();
            }
            var currentIndex = 0;
            for(; currentIndex < queue.length && queue[currentIndex].id != currentTask.id; currentIndex++);
            queue[currentIndex].insertCounter = queue[currentIndex].insertCounter || 0;
            queue[currentIndex].insertCounter++;
            queue.splice(currentIndex + queue[currentIndex].insertCounter,0,{ fn: wrapFn(func) });
            return this;
        };

        this.paralFunc = function(fn){
			var q = this;
            var parallerWrapper = getLastParalWrapper();

            if(!parallerWrapper){
                parallerWrapper = {
                    paralFunc: function(fn){
                        if(!fn || arguments.length == 0){
                            return this;
                        }
                        this.fnArr.push(fn);
                        return this;
                    }
                    , fnArr:[]
                    , exec: function() {
                        breakParal();
                        self.func.apply(self, this.fnArr);
                        return self;
                    }
                    , func: function(){
                        this.exec();
                        return q.func.apply(q,arguments);
                    }
                };
                parallers.push(parallerWrapper);
            }

            return parallerWrapper.paralFunc(fn);
        };

        this.exec = function(){
            return this;
        };

        this.data = function(key, value) {
            switch (arguments.length){
                case 0: return data;
                case 1: return data[key];
                case 2: data[key] = value; break;
            }
            return this;
        };

        this.length = function(){
           return queue.length;
        };

        this.ensure = function(key, value){
            if(this.data(key) === undefined){
                this.data(key, value);
            }
            return this;
        };

        var cbFactory = function(isParal){
            return function ( /* asyncCall ,args..., fn */ ) {
                var argArr = getArgArray(arguments)
                    , hasCtx = argArr.length >= 3 && isFunction(argArr[1])
                    , ctx = hasCtx && argArr[0]
                    , asyncCall = hasCtx ? argArr[1] : argArr[0]
                    , lastArg = argArr[argArr.length - 1]
                    , hasFn = isFunction(lastArg)
                    , fn = hasFn ? lastArg : function() { return arguments; }
                    , asyncArgs = argArr.splice( hasCtx? 2: 1, argArr.length - ( (hasCtx? 3 : 2) - (hasFn? 0 : 1) ))
                    , $anonymousAwait = self.$awaitData( nameId('anonymous-data-') + (fn.name||'') );

                (isParal? this.paralFunc: this.func)(function(next) {
                    var subQueue = this;

                    asyncArgs.push(function(){

                        var asyncResArgs = getArgArray(arguments).map(function(arg){
                            if(arg instanceof $AwaitData){
                                return arg.result();
                            }
                            return arg;
                        });

                        var asyncHasCallback = (asyncResArgs.length+1) < fn.length;

                        asyncResArgs.push(asyncArgs);

                        if(asyncHasCallback) {
                            asyncResArgs.push(next);
                        }

                        var result = fn.apply(subQueue, asyncResArgs);

                        $anonymousAwait.result( result === undefined ? arguments : result );

                        !asyncHasCallback && next();

                    });

                    asyncCall.apply(ctx, asyncArgs);
                });

                return $anonymousAwait;

            };
        };

        var eachCbFactory = function(isParal){
            return function(asyncCall , eachArgs, fn) {
                var ctx
                    , standardiseArg = function(arg){
                        if(arg instanceof  Array) {
                            return arg;
                        }
                        if(typeof (arg) != 'string' && arg && arg.length >= 0){
                            return getArgArray( arg );
                        }
                        return [arg];
                    }
                    , $waitList = self.$awaitData( nameId('anonymous-data')  );
                if(arguments.length == 4){
                    ctx = arguments[0];
                    asyncCall = arguments[1];
                    eachArgs = arguments[2];
                    fn = arguments[3];
                }
				
				this.func(function(next) {
					
					if(eachArgs instanceof $AwaitData){
						eachArgs = eachArgs.result();
					}

					var subQueue = this;
					
					var $list = isArray(eachArgs) && eachArgs.map(function(arg) {
						var asyncArgs = standardiseArg(arg);
						asyncArgs.splice(0, 0, asyncCall);
						ctx && asyncArgs.splice(0, 0, ctx);
						asyncArgs.push(fn);
						return subQueue[isParal? '$paralAwait' : '$await'].apply(subQueue, asyncArgs);
					});

                    $waitList.result($list||[]);

                    isArray(eachArgs) && eachArgs.length && subQueue.func(function(){ next() });

				});

                return $waitList;
            };
        };

        var awaitData = {};

        this.$awaitData = function(key, value) {
            this.data.apply(this, arguments);
            if(awaitData[key]) {
                return awaitData[key];
            } else {
                awaitData[key] = new $AwaitData(this, key);
            }
            if(arguments.length == 2){
                awaitData[key].result(value);
            }
			return  awaitData[key];
        };

        this.$await = cbFactory();

        this.$paralAwait = cbFactory(true);

        this.$each = eachCbFactory();

        this.$paralEach = eachCbFactory(true);

        //await result from standard callback
        var standardAwaitMethod = function(method) {
            return function(){
                var args = getArgArray(arguments);
                args.push(function(err, res){
                    this.error(err);
                    return res;
                });
                return self['$'+method].apply(this, args);
            }
        };

        this.$$await = standardAwaitMethod('await');
        this.$$paralAwait = standardAwaitMethod('paralAwait');
        this.$$each = standardAwaitMethod('each');
        this.$$paralEach = standardAwaitMethod('paralEach');

    }

    function createInstance() {
        return new Queue();
    };

    createInstance.$AwaitData = $AwaitData;

    createInstance.simpleCounter = simpleCounter;

    module.exports =  createInstance;

})(module);