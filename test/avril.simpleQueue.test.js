/**
 * Created by trump on 15-1-4.
 */
var assert = require("assert");
var avQ = require('../index');
var fs = require('fs-extra');
var os = require('os');

describe('avQ', function(){
    var ranTime = function(){
        return parseInt(5 * Math.random())
    };

    var findById = function(id, callback) {
        var db = this.db || 'file';
        setTimeout(function(){
            callback(null, {
                id: id
                , name: 'user' + id
                , db: db
                , age: parseInt( 99 * Math.random() )
            });
        }, ranTime());
    };

    describe('#func', function(){
        it('should execute 3 times', function(){
            var q1 = avQ();
            var counter = 0;
            q1.func(function(){ counter++; });
            q1.func(function(){ counter++; });
            q1.func(function(){
                counter++;
                assert(counter, 3);
            });
        });
    });

    describe('#paralFunc', function(){
        it('should execute 3 times', function(done){
            var q1 = avQ();
            var counter = 0;
            var paralObj = q1.paralFunc();

            paralObj.paralFunc(function(){ counter++; });
            paralObj.paralFunc(function(){ counter++; });
            paralObj.paralFunc(function(){
                counter++;
            });
            paralObj.func(function(){
                assert(counter, 3);
                done();
            });

        });

        it('should cost 1 second', function(){

        })
    });

    describe('#data', function(done){
        it('data1 should be data1', function(){
            var q = avQ();
            q.paralFunc(function(next){
                setTimeout(function(){
                    q.data('data1', 'data1');
                    next();
                },100);
            });
            q.paralFunc(function(next){
                setTimeout(function(){
                    q.data('data2', 'data2');
                    next();
                },140);
            });
            q.paralFunc(function(next){
                setTimeout(function(){
                    q.data('data3', 'data3');
                    next();
                },130);
            });
            q.func(function(){
                assert(q.data('data1'), 'data1');
                assert(Object.keys(q.data()).length , 3);
            });
        });
    });

    describe('#insertFunc', function(){
        it('should executed correct', function(){
            var q = avQ();
            var counter = 0;
            q.func(function(next, task) {
                counter++;
                q.insertFunc(function(){
                    assert.equal(counter, 1);
                    counter++;
                });
                q.insertFunc(task, function(){
                    assert.equal(counter, 2);
                    counter++;
                });
                next();
            });
            q.func(function(){
                assert.equal(counter, 3);
            });
        });
    });

    describe('#paralFunc #func', function(){
        this.timeout(5000);
        it('paralFunc should be fast', function(done) {
            var mainQueue = avQ();
            var t1 = 0, t2 = 0;
            mainQueue.func(function func(next){
                var q = avQ();
                var now = Date.now();
                q.func(function(next1){
                    setTimeout(next1,1000);
                });
                q.func(function(next1){
                    setTimeout(next1,1000);
                });
                q.func(function(){
                    t1 = Date.now() - now;
                    assert(t1, 0);
                    next();
                });
            });
            mainQueue.func(function paralFunc(next){
                var q = avQ();
                var now = Date.now();
                q.paralFunc(function(next1) {
                    setTimeout(next1,1000);
                });
                q.paralFunc(function(next1){
                    setTimeout(next1,1000);
                });
                q.func(function(){
                    t2 = Date.now() - now;
                    next();
                });
            });

            mainQueue.func(function() {
                assert.equal(true, t1 > t2 );
                assert.equal( parseInt( t1/1000) , 2 );
                assert.equal( parseInt( t2/1000) , 1 );
                done();
            });
        });
    });

    describe('#$await & $each', function(){
        this.timeout(500000);

        it('users[2].name === "user2"', function(done){
            var q = avQ();

            q.$await(fs, fs.readFile, './test/data/test.txt', 'utf8' , function(err, fileContent, arg){
                q.data('ids', fileContent.split(os.EOL));
            });

            q.$each({ db: 'sql' }, findById, q.$awaitData('ids'), function(err, user) {

                q.ensure('users',[]);

                q.data('users').push(user);

                user.friends = [];

                this.$each(findById, [ 11,12,13,14], function(err, friend) {
                    user.friends.push(friend);
                    friend.names = [];
                    this.$each(findById, [31,32,33], function(e, name){
                        friend.names.push(name);
                    })
                });

            });

            q.func(function(){
                assert.equal(q.data('users')[2].name, 'user3');
                assert.equal(q.data('users')[8].friends.length, 4);
                assert.equal(q.data('users')[8].friends[0].names.length, 3);
                assert.equal('sql', q.data('users')[0].db);
            });
			
			q.func(function(){done();});
        });

    });

    describe('#$paralAwait & $paralEach', function(){
        this.timeout(500000);

        it('users[2].name === "user2"', function(done){
            var q = avQ();
            
            q.$paralAwait( fs.readFile, './test/data/test.txt', 'utf8', function(err, fileContent){
                q.data('ids', fileContent.split(os.EOL));
            });

            q.$paralEach({ db: 'mongodb' }, findById, q.$awaitData('ids'), function(err, user, arg) {
                q.ensure('users',[]);
                var id = arg[0];
                q.data('users')[ q.data('ids').indexOf(id) ] = user;
                user.friends = [];

                this.$paralEach(findById, [ 11,12,13,14], function(err, friend) {
                    //console.log('user:',user.id,friend.id);
                    user.friends.push(friend);
                    friend.names = [];
                    this.$paralEach(findById, [31,32,33], function(e, name){
                        friend.names.push(name);
                    })
                });
            });

            q.func(function(){
                assert.equal(q.id , this._pid);
                assert.equal(q.data('users')[2].name, 'user3');
                assert.equal(q.data().users[8].friends[0].names.length, 3);
                assert.equal('mongodb', q.data().users[0].db);
            });

            var $userIds = q.$await( fs.readFile, './test/data/test.txt', 'utf8', function(err, fileContent){ return fileContent.split(os.EOL) });

            var $userList = q.$each(findById, $userIds, function(err, user){ return user; });


            var $userIdsFromUserList = $userList.conver(function($org){
                return $org.result().map(function($u){ 
                    return  $u.result().id ; 
                });
            });

            q.func(function(){

                assert.equal($userIds.result().length , 9);
                
                assert.equal($userIdsFromUserList.result().length , 9);
                
                assert.equal( $userList.realResult().length , 9 );

                assert.equal($userIdsFromUserList.result().length , 9);

                assert.equal($userIdsFromUserList.result().length , 9);

                assert.equal($userIds.result().length , 9);

                done();
            });

        });

    });

    describe('#stop', function(){
        this.timeout(500000);
        it('should clear queue after stop', function(done){
            var q = avQ('main');

            q.func(function(next){
                setTimeout(function(){
                    next();
                },100);
            });

            q.func(function(next){
                setTimeout(function(){
                    next();
                },100);
            });

            q.func(function(next){
                setTimeout(function(){
                    next();
                },100);
            });

            q.func(function(next){
                setTimeout(function(){
                    next();
                },100);
            });

            setTimeout(function(){
                assert.equal(q.length(), 4);
            },90);

            setTimeout(function(){
                assert.equal(q.length(), 3);
            },110);

            setTimeout(function(){
                q.stop();
                assert.equal(q.length(), 0);
            },120);

            setTimeout(function(){ done(); },1000);
        });

    });

    describe('#error, onError', function(){
        this.timeout(50000);

        it('should popup the error', function(done){
            var q = avQ();

            q.$await(fs, fs.readFile, './data/test.txt', 'utf8', function(err, file) {
               this.error('error');
            });

            q.onError(function(){
                assert.equal('error', q.error());
                done();
            });

        });
    });

    describe('#$$await & $$each', function(){
        it('user number should be 9', function(done){
            var q = avQ();

            var $fileContent = q.$$await( fs.readFile, './test/data/test.txt', 'utf8');

            var $userIds = $fileContent.conver(function($org){
                return $org.result().split(os.EOL);
            });

            var $userJsonList = $userIds.conver(function($org){
                return $org.result().map(function(id){
                    return './test/data/json/'+id+'.json';
                });
            });

            var $jsonFiles = q.$$paralEach(fs.readJson, $userJsonList);

            var $userList = q.$$each(findById, $userIds);

            var $userListOfParal = q.$$paralEach(findById, $userIds);

            var $userIdsFromUserList = $userList.conver(function($org){
                return $org.result().map(function($u){
                    return  $u.result().id ;
                });
            });

            var $fileContentParalAwait = q.$$paralAwait(fs.readJson, './test/data/json/1.json');

            q.func(function(){

                assert.equal($fileContentParalAwait.result().name , 'user1');

                assert.equal($jsonFiles.result().length, 9);

                assert.equal($jsonFiles.result().filter(function($file){ return  $file.result();  }).length, 4);

                assert.equal($userIds.result().length , 9);

                assert.equal($userIdsFromUserList.result().length , 9);

                assert.equal( $userList.realResult().length , 9 );

                assert.equal($userIdsFromUserList.result().length , 9);

                assert.equal($userIdsFromUserList.result().length , 9);

                assert.equal($userIds.result().length , 9);

                assert.equal($userListOfParal.result().length , 9);

                assert.equal($userListOfParal.result()[0].result().name , 'user1');

                done();
            });

        })
    });

    describe('#if', function() {
        it('should have test.txt', function(done) {
            var q = avQ();
            var trueFilePath = './test/data/test.txt'
                , falseFilePath = './test/data/test.txt-false'
                , $fileContent
                , wontHaveValue = true
                , shouldHaveValue = true
                , executeElseIf = false
                , $hasFileTrue = q.$await(fs.exists, trueFilePath)
                , $hasFalseFile = q.$await(fs.exists, falseFilePath);

            q.$if($hasFileTrue, function() {
                    $fileContent = this.$$await(fs.readFile, trueFilePath, 'utf8');
                })
                .$else(function(){
                    wontHaveValue = false;
                });

            q.$if($hasFalseFile, function(){
                shouldHaveValue = false;
            }).$elseIf($hasFileTrue, function() {
                executeElseIf = true;
            });

            q.func(function() {
                assert.equal(!!$fileContent, true);
                assert.equal($fileContent.result().split(os.EOL).length, 9);
                assert.equal(wontHaveValue, true);
                assert.equal(shouldHaveValue, true);
                assert.equal(executeElseIf, true);
                done();
            });
        })
    });
});