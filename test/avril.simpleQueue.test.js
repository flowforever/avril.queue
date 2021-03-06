/**
 * Created by trump on 15-1-4.
 */
var assert = require("assert");
var avQ = require('../index');
var fs = require('fs-extra');
var os = require('os');

describe('avQ', function () {
    var ranTime = function () {
        return parseInt(5 * Math.random())
    };

    var findById = function (id, callback) {
        var db = this.db || 'file';
        setTimeout(function () {
            callback(null, {
                id: id
                , name: 'user' + id
                , db: db
                , age: parseInt(99 * Math.random())
            });
        }, ranTime());
    };

    describe('#func', function () {
        it('should execute 3 times', function () {
            var q1 = avQ();
            var counter = 0;
            q1.func(function () {
                counter++;
            });
            q1.func(function () {
                counter++;
            });
            q1.func(function () {
                counter++;
                assert(counter, 3);
            });
        });
    });

    describe('#paralFunc', function () {
        it('should execute 3 times', function (done) {
            var q1 = avQ();
            var counter = 0;
            var paralObj = q1.paralFunc();

            paralObj.paralFunc(function () {
                counter++;
            });
            paralObj.paralFunc(function () {
                counter++;
            });
            paralObj.paralFunc(function () {
                counter++;
            });
            paralObj.func(function () {
                assert(counter, 3);
                done();
            });

        });

        it('should cost 1 second', function () {

        })
    });

    describe('#data', function (done) {
        it('data1 should be data1', function () {
            var q = avQ();
            q.paralFunc(function (next) {
                setTimeout(function () {
                    q.data('data1', 'data1');
                    next();
                }, 100);
            });
            q.paralFunc(function (next) {
                setTimeout(function () {
                    q.data('data2', 'data2');
                    next();
                }, 140);
            });
            q.paralFunc(function (next) {
                setTimeout(function () {
                    q.data('data3', 'data3');
                    next();
                }, 130);
            });
            q.func(function () {
                assert(q.data('data1'), 'data1');
                assert(Object.keys(q.data()).length, 3);
            });
        });
    });

    describe('#insertFunc', function () {
        it('should executed correct', function () {
            var q = avQ();
            var counter = 0;
            q.func(function (next, task) {
                counter++;
                q.insertFunc(function () {
                    assert.equal(counter, 1);
                    counter++;
                });
                q.insertFunc(task, function () {
                    assert.equal(counter, 2);
                    counter++;
                });
                next();
            });
            q.func(function () {
                assert.equal(counter, 3);
            });
        });
    });

    describe('#paralFunc #func', function () {
        this.timeout(5000);
        it('paralFunc should be fast', function (done) {
            var mainQueue = avQ();
            var t1 = 0, t2 = 0;
            mainQueue.func(function func(next) {
                var q = avQ();
                var now = Date.now();
                q.func(function (next1) {
                    setTimeout(next1, 1000);
                });
                q.func(function (next1) {
                    setTimeout(next1, 1000);
                });
                q.func(function () {
                    t1 = Date.now() - now;
                    assert(t1, 0);
                    next();
                });
            });
            mainQueue.func(function paralFunc(next) {
                var q = avQ();
                var now = Date.now();
                q.paralFunc(function (next1) {
                    setTimeout(next1, 1000);
                });
                q.paralFunc(function (next1) {
                    setTimeout(next1, 1000);
                });
                q.func(function () {
                    t2 = Date.now() - now;
                    next();
                });
            });

            mainQueue.func(function () {
                assert.equal(true, t1 > t2);
                assert.equal(parseInt(t1 / 1000), 2);
                assert.equal(parseInt(t2 / 1000), 1);
                done();
            });
        });
    });

    describe('#$await & $each', function () {
        this.timeout(500000);

        it('users[2].name === "user2"', function (done) {
            var q = avQ();

            q.$await(fs, fs.readFile, './test/data/test.txt', 'utf8', function (err, fileContent, arg) {
                q.data('ids', fileContent.split(os.EOL));
            });

            q.$each({db: 'sql'}, findById, q.$awaitData('ids'), function (err, user) {

                q.ensure('users', []);

                q.data('users').push(user);

                user.friends = [];

                this.$each(findById, [11, 12, 13, 14], function (err, friend) {
                    user.friends.push(friend);
                    friend.names = [];
                    this.$each(findById, [31, 32, 33], function (e, name) {
                        friend.names.push(name);
                    })
                });

            });

            q.func(function () {
                assert.equal(q.data('users')[2].name, 'user3');
                assert.equal(q.data('users')[8].friends.length, 4);
                assert.equal(q.data('users')[8].friends[0].names.length, 3);
                assert.equal('sql', q.data('users')[0].db);
            });

            q.func(function () {
                done();
            });
        });

    });

    describe('#$paralAwait & $paralEach', function () {
        this.timeout(500000);

        it('users[2].name === "user2"', function (done) {
            var q = avQ();
            
            q.$paralAwait(fs.readFile, './test/data/test.txt', 'utf8', function (err, fileContent) {
                q.data('ids', fileContent.split(os.EOL));
            });


            q.$paralEach({db: 'mongodb'}, findById, q.$awaitData('ids'), function (err, user) {
                q.ensure('users', []);
                var id = user.id;
                q.data('users')[q.data('ids').indexOf(id)] = user;
                user.friends = [];

                this.$paralEach(findById, [11, 12, 13, 14], function (err, friend) {
                    user.friends.push(friend);
                    friend.names = [];
                    this.$paralEach(findById, [31, 32, 33], function (e, name) {
                        friend.names.push(name);
                    })
                });
            });

            q.func(function () {
                assert.equal(q.id, this._pid);
                assert.equal(q.data('users')[2].name, 'user3');
                assert.equal(q.data().users[8].friends[0].names.length, 3);
                assert.equal('mongodb', q.data().users[0].db);
            });

            var $userIds = q.$await(fs.readFile, './test/data/test.txt', 'utf8', function (err, fileContent) {
                return fileContent.split(os.EOL)
            });

            var $userList = q.$each(findById, $userIds, function (err, user) {
                return user;
            });


            var $userIdsFromUserList = $userList.conver(function ($org) {
                return $org.result().map(function ($u) {
                    return $u.result().id;
                });
            });

            q.func(function () {

                assert.equal($userIds.result().length, 9);
                
                assert.equal($userIdsFromUserList.result().length, 9);
                
                assert.equal($userList.realResult().length, 9);

                assert.equal($userIdsFromUserList.result().length, 9);

                assert.equal($userIdsFromUserList.result().length, 9);

                assert.equal($userIds.result().length, 9);

                done();
            });

        });

    });

    describe('#stop', function () {
        this.timeout(500000);
        it('should clear queue after stop', function (done) {
            var q = avQ('main');

            q.func(function (next) {
                setTimeout(function () {
                    next();
                }, 100);
            });

            q.func(function (next) {
                setTimeout(function () {
                    next();
                }, 100);
            });

            q.func(function (next) {
                setTimeout(function () {
                    next();
                }, 100);
            });

            q.func(function (next) {
                setTimeout(function () {
                    next();
                }, 100);
            });

            setTimeout(function () {
                assert.equal(q.length(), 4);
            }, 90);

            setTimeout(function () {
                assert.equal(q.length(), 3);
            }, 110);

            setTimeout(function () {
                q.stop();
                assert.equal(q.length(), 0);
            }, 120);

            setTimeout(function () {
                done();
            }, 1000);
        });

    });

    describe('#error, onError', function () {
        this.timeout(50000);

        it('should popup the error', function (done) {
            var q = avQ();

            q.$await(fs, fs.readFile, './data/test.txt', 'utf8', function (err, file) {
                this.error('error');
            });

            q.onError(function () {
                assert.equal('error', q.error());
                done();
            });

        });
    });

    describe('#$$await & $$each', function () {
        it('user number should be 9', function (done) {
            var q = avQ();

            var q2 = avQ();

            var q3 = avQ();

            var $fileContent = q2.$$await(fs.readFile, './test/data/test.txt', 'utf8');

            var $userIds = $fileContent.conver(function ($org) {
                return $org.result().split(os.EOL);
            });

            var $userJsonList = $userIds.conver(function ($org) {
                return $org.result().map(function (id) {
                    return './test/data/json/' + id + '.json';
                });
            });

            var $jsonFiles = avQ().$$paralEach(fs.readJson, $userJsonList);

            var $userList = q.$$each(findById, $userIds);

            var $userListOfParal = q3.$$paralEach(findById, $userIds);

            var $userIdsFromUserList = $userList.conver(function ($org) {
                return $org.result().map(function ($u) {
                    return $u.result().id;
                });
            });

            var $fileContentParalAwait = q.$$paralAwait(fs.readJson, './test/data/json/1.json');

            q.func(function () {

                assert.equal($fileContentParalAwait.result().name, 'user1');

                assert.equal($jsonFiles.result().length, 9);

                assert.equal($jsonFiles.result().filter(function ($file) {
                    return $file.result() && $file.result().name;
                }).length, 4);

                assert.equal($userIds.result().length, 9);

                assert.equal($userIdsFromUserList.result().length, 9);

                assert.equal($userList.realResult().length, 9);

                assert.equal($userIdsFromUserList.result().length, 9);

                assert.equal($userIdsFromUserList.result().length, 9);

                assert.equal($userIds.result().length, 9);

                assert.equal($userListOfParal.result().length, 9);

                assert.equal($userListOfParal.result()[0].result().name, 'user1');

                done();
            });

        })
    });

    describe('#if', function () {
        it('should have test.txt', function (done) {
            var q = avQ();
            var trueFilePath = './test/data/test.txt'
                , falseFilePath = './test/data/test.txt-false'
                , $fileContent
                , wontHaveValue = true
                , shouldHaveValue = true
                , executeElseIf = false
                , $hasFileTrue = q.$await(fs.exists, trueFilePath)
                , $hasFalseFile = q.$await(fs.exists, falseFilePath);

            q.$if($hasFileTrue, function () {
                $fileContent = this.$$await(fs.readFile, trueFilePath, 'utf8');
            })
                .$else(function () {
                    wontHaveValue = false;
                });

            q.$if($hasFalseFile, function () {
                shouldHaveValue = false;
            }).$elseIf($hasFileTrue, function () {
                executeElseIf = true;
            });

            q.func(function () {
                assert.equal(!!$fileContent, true);
                assert.equal($fileContent.result().split(os.EOL).length, 9);
                assert.equal(wontHaveValue, true);
                assert.equal(shouldHaveValue, true);
                assert.equal(executeElseIf, true);
                done();
            });
        })
    });

    describe('#resolve', function () {
        var filePath = './test/data/json/1.json';
        var $file1 = avQ().$$paralAwait(fs.readFile, filePath, 'utf8');
        var $file2 = avQ().$$await(fs.readFile, filePath, 'utf8');
        var $file3 = avQ().$$await(fs.readFile, filePath, 'utf8');


        var $file5 = avQ().$$await(fs.readFile, filePath, 'utf8');
        var $file6 = avQ().$$paralAwait(fs.readFile, filePath, 'utf8');
        var $file7 = avQ().$$await(fs.readFile, filePath, 'utf8');

        it('should have content after resolved', function (done) {
            var q = avQ();
            q.resolve($file1, $file2, $file3, function () {
                assert.equal(!!$file1.result(), true);
                assert.equal($file1.result(), $file2.result());
                assert.equal($file2.result(), $file3.result());
                done();
            });
        });

        it('should have content after paral resolved', function (done) {
            var q = avQ();
            q.paralResolve($file5, $file6, $file7).next(function () {
                assert.equal(!!$file5.result(), true);
                assert.equal($file6.result(), $file5.result());
                assert.equal($file5.result(), $file7.result());
                done();
            });
        });
    });

    describe('#or', function () {
        var q = avQ()
            , filePath1 = './test/data/json/1.json'
            , filePath2 = './test/data/json/2.json'
            , filePath5 = './test/data/json/5.json'
            , trueValue
            , falseValue;

        it('should be true', function (done) {
            var $orRes = q.$or(
                false,
                q.$await(fs.exists, filePath1),
                q.$await(fs.exists, filePath5),
                false
            );

            q.$if($orRes, function () {
                trueValue = true;
            }).$else(function () {
                trueValue = false;
            });

            var $andRes = q.$and(
                true,
                q.$await(fs.exists, filePath2),
                q.$await(fs.exists, filePath5),
                true
            );

            q.func(function () {
                console.log('$andRes', $andRes.result())
            });

            q.$if($andRes, function () {
                falseValue = true;
            }).$else(function () {
                falseValue = false;
            });

            q.func(function () {
                assert.equal(trueValue, true);
                assert.equal(falseValue, false);
                done();
            })
        })
    });

    describe('#wrap', function () {
        var q = avQ()
            , obj = {
                func0: function (callback) {
                    setTimeout(function () {
                        callback(null, 'func0');
                    });
                }
                , func1: function (arg1, arg2, arg3, callback) {
                    setTimeout(function () {
                        callback(null, [arg1, arg2, arg3].join('-'))
                    }, 1)
                }
                , func2: function (arg1, callback) {
                    setTimeout(function () {
                        callback(null, arg1)
                    }, 1)
                }
                , funcError0: function (arg1, arg2, callback) {
                    setTimeout(function () {
                        if (arg1 === null) {
                            return callback('Error_Arg1')
                        }
                        callback(null, [arg1, arg2].join('-'))
                    }, 1);
                }
            };

        it('func0', function (done) {
            var $result0 = q.wrap(obj).$$func0();
            q.func(function () {
                assert.equal($result0.result(), 'func0');
                done();
            });
        });

        it('func1', function (done) {
            var $result1 = q.wrap(obj).$$func1('1', '2', '3');
            q.func(function () {
                assert.equal($result1.result(), '1-2-3');
                done();
            });
        });

        it('func2', function (done) {
            var $result1 = q.wrap(obj).$$func2('1');
            q.func(function () {
                assert.equal($result1.result(), '1');
                done();
            });
        });

        it('func2 again', function (done) {
            var $result1 = q.wrap(obj).$$func2('1');
            q.func(function () {
                assert.equal($result1.result(), '1');
                done();
            });
        });


        it('func3', function (done) {
            var q = avQ(), testValue = 0;
            q.wrap(obj).$$funcError0(null, 'erro');
            q.func(function(){ testValue = 1; });
            q.onError(function (error) {
                assert.equal(error, 'Error_Arg1');
                assert.equal(testValue, 0);
                done();
            });
        });

    })

});