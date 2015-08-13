declare module "avril.queue" {
    interface AwaitData {
        result():any;
        resolve(fn:Function);
        error(): any;
        q: Queue;
    }
    interface BooleanData {
        $else(fn:Function): void;
    }
    interface Queue {
        func(fn:Function): Queue;
        await(...args): void;
        $await(...args): AwaitData;
        $$await(...args): AwaitData;
        $paralAwait(...args):AwaitData;
        $$paralAwait(...args):AwaitData;
        each(...args): Queue;
        wrap(obj): any;
        paralFunc(fn:Function): Queue;
        $if(check, fn:Function):BooleanData;
        $if(check):BooleanData;
        $and(...args): AwaitData;
        error(): any;
        error(error): any;
        onError(fn:Function):Queue;
        length(): number;
    }

    function Q():Queue;

    module Q {
        function safe(obj: Object);
    }

    export = Q;
}