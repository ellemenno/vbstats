var bundle = (function () {
    'use strict';

    function noop() { }
    const identity$2 = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function set_store_value(store, ret, value = ret) {
        store.set(value);
        return ret;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function stop_propagation(fn) {
        return function (event) {
            event.stopPropagation();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_attributes(node, attributes) {
        // @ts-ignore
        const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
        for (const key in attributes) {
            if (attributes[key] == null) {
                node.removeAttribute(key);
            }
            else if (key === 'style') {
                node.style.cssText = attributes[key];
            }
            else if (key === '__value') {
                node.value = node[key] = attributes[key];
            }
            else if (descriptors[key] && descriptors[key].set) {
                node[key] = attributes[key];
            }
            else {
                attr(node, key, attributes[key]);
            }
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    // unfortunately this can't be a constant as that wouldn't be tree-shakeable
    // so we cache the result instead
    let crossorigin;
    function is_crossorigin() {
        if (crossorigin === undefined) {
            crossorigin = false;
            try {
                if (typeof window !== 'undefined' && window.parent) {
                    void window.parent.document;
                }
            }
            catch (error) {
                crossorigin = true;
            }
        }
        return crossorigin;
    }
    function add_resize_listener(node, fn) {
        const computed_style = getComputedStyle(node);
        if (computed_style.position === 'static') {
            node.style.position = 'relative';
        }
        const iframe = element('iframe');
        iframe.setAttribute('style', 'display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; ' +
            'overflow: hidden; border: 0; opacity: 0; pointer-events: none; z-index: -1;');
        iframe.setAttribute('aria-hidden', 'true');
        iframe.tabIndex = -1;
        const crossorigin = is_crossorigin();
        let unsubscribe;
        if (crossorigin) {
            iframe.src = "data:text/html,<script>onresize=function(){parent.postMessage(0,'*')}</script>";
            unsubscribe = listen(window, 'message', (event) => {
                if (event.source === iframe.contentWindow)
                    fn();
            });
        }
        else {
            iframe.src = 'about:blank';
            iframe.onload = () => {
                unsubscribe = listen(iframe.contentWindow, 'resize', fn);
            };
        }
        append(node, iframe);
        return () => {
            if (crossorigin) {
                unsubscribe();
            }
            else if (unsubscribe && iframe.contentWindow) {
                unsubscribe();
            }
            detach(iframe);
        };
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function beforeUpdate(fn) {
        get_current_component().$$.before_update.push(fn);
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity$2, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_out_transition(node, fn, params) {
        let config = fn(node, params);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity$2, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config();
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity$2, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program || pending_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.37.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }
    function quintOut(t) {
        return --t * t * t * t * t + 1;
    }

    function fade(node, { delay = 0, duration = 400, easing = identity$2 } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 } = {}) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }
    function slide(node, { delay = 0, duration = 400, easing = cubicOut } = {}) {
        const style = getComputedStyle(node);
        const opacity = +style.opacity;
        const height = parseFloat(style.height);
        const padding_top = parseFloat(style.paddingTop);
        const padding_bottom = parseFloat(style.paddingBottom);
        const margin_top = parseFloat(style.marginTop);
        const margin_bottom = parseFloat(style.marginBottom);
        const border_top_width = parseFloat(style.borderTopWidth);
        const border_bottom_width = parseFloat(style.borderBottomWidth);
        return {
            delay,
            duration,
            easing,
            css: t => 'overflow: hidden;' +
                `opacity: ${Math.min(t * 20, 1) * opacity};` +
                `height: ${t * height}px;` +
                `padding-top: ${t * padding_top}px;` +
                `padding-bottom: ${t * padding_bottom}px;` +
                `margin-top: ${t * margin_top}px;` +
                `margin-bottom: ${t * margin_bottom}px;` +
                `border-top-width: ${t * border_top_width}px;` +
                `border-bottom-width: ${t * border_bottom_width}px;`
        };
    }
    function scale(node, { delay = 0, duration = 400, easing = cubicOut, start = 0, opacity = 0 } = {}) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const sd = 1 - start;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (_t, u) => `
			transform: ${transform} scale(${1 - (sd * u)});
			opacity: ${target_opacity - (od * u)}
		`
        };
    }

    function oe(n){return l=>{const o=Object.keys(n.$$.callbacks),i=[];return o.forEach(o=>i.push(listen(l,o,e=>bubble(n,e)))),{destroy:()=>{i.forEach(e=>e());}}}}function ie(){return "undefined"!=typeof window&&!(window.CSS&&window.CSS.supports&&window.CSS.supports("(--foo: red)"))}function se(e){var t;return "r"===e.charAt(0)?e=(t=(t=e).match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i))&&4===t.length?"#"+("0"+parseInt(t[1],10).toString(16)).slice(-2)+("0"+parseInt(t[2],10).toString(16)).slice(-2)+("0"+parseInt(t[3],10).toString(16)).slice(-2):"":"transparent"===e.toLowerCase()&&(e="#00000000"),e}const{document:re}=globals;function ae(e){let t;return {c(){t=element("div"),attr(t,"class","ripple svelte-po4fcb");},m(n,l){insert(n,t,l),e[4](t);},p:noop,i:noop,o:noop,d(n){n&&detach(t),e[4](null);}}}function ce(e,t){e.style.transform=t,e.style.webkitTransform=t;}function de(e,t){e.style.opacity=t.toString();}const ue=function(e,t){const n=["touchcancel","mouseleave","dragstart"];let l=t.currentTarget||t.target;if(l&&!l.classList.contains("ripple")&&(l=l.querySelector(".ripple")),!l)return;const o=l.dataset.event;if(o&&o!==e)return;l.dataset.event=e;const i=document.createElement("span"),{radius:s,scale:r,x:a,y:c,centerX:d,centerY:u}=((e,t)=>{const n=t.getBoundingClientRect(),l=function(e){return "TouchEvent"===e.constructor.name}(e)?e.touches[e.touches.length-1]:e,o=l.clientX-n.left,i=l.clientY-n.top;let s=0,r=.3;const a=t.dataset.center;t.dataset.circle?(r=.15,s=t.clientWidth/2,s=a?s:s+Math.sqrt((o-s)**2+(i-s)**2)/4):s=Math.sqrt(t.clientWidth**2+t.clientHeight**2)/2;const c=(t.clientWidth-2*s)/2+"px",d=(t.clientHeight-2*s)/2+"px";return {radius:s,scale:r,x:a?c:o-s+"px",y:a?d:i-s+"px",centerX:c,centerY:d}})(t,l),p=l.dataset.color,f=2*s+"px";i.className="animation",i.style.width=f,i.style.height=f,i.style.background=p,i.classList.add("animation--enter"),i.classList.add("animation--visible"),ce(i,`translate(${a}, ${c}) scale3d(${r},${r},${r})`),de(i,0),i.dataset.activated=String(performance.now()),l.appendChild(i),setTimeout(()=>{i.classList.remove("animation--enter"),i.classList.add("animation--in"),ce(i,`translate(${d}, ${u}) scale3d(1,1,1)`),de(i,.25);},0);const v="mousedown"===e?"mouseup":"touchend",h=function(){document.removeEventListener(v,h),n.forEach(e=>{document.removeEventListener(e,h);});const e=performance.now()-Number(i.dataset.activated),t=Math.max(250-e,0);setTimeout(()=>{i.classList.remove("animation--in"),i.classList.add("animation--out"),de(i,0),setTimeout(()=>{i&&l.removeChild(i),0===l.children.length&&delete l.dataset.event;},300);},t);};document.addEventListener(v,h),n.forEach(e=>{document.addEventListener(e,h,{passive:!0});});},pe=function(e){0===e.button&&ue(e.type,e);},fe=function(e){if(e.changedTouches)for(let t=0;t<e.changedTouches.length;++t)ue(e.type,e.changedTouches[t]);};function ve(e,t,n){let l,o,{center:i=!1}=t,{circle:s=!1}=t,{color:r="currentColor"}=t;return onMount(async()=>{await tick();try{i&&n(0,l.dataset.center="true",l),s&&n(0,l.dataset.circle="true",l),n(0,l.dataset.color=r,l),o=l.parentElement;}catch(e){}if(!o)return void console.error("Ripple: Trigger element not found.");let e=window.getComputedStyle(o);0!==e.position.length&&"static"!==e.position||(o.style.position="relative"),o.addEventListener("touchstart",fe,{passive:!0}),o.addEventListener("mousedown",pe,{passive:!0});}),onDestroy(()=>{o&&(o.removeEventListener("mousedown",pe),o.removeEventListener("touchstart",fe));}),e.$$set=e=>{"center"in e&&n(1,i=e.center),"circle"in e&&n(2,s=e.circle),"color"in e&&n(3,r=e.color);},[l,i,s,r,function(e){binding_callbacks[e?"unshift":"push"](()=>{l=e,n(0,l);});}]}class he extends SvelteComponent{constructor(e){var t;super(),re.getElementById("svelte-po4fcb-style")||((t=element("style")).id="svelte-po4fcb-style",t.textContent=".ripple.svelte-po4fcb{display:block;position:absolute;top:0;left:0;right:0;bottom:0;overflow:hidden;border-radius:inherit;color:inherit;pointer-events:none;z-index:0;contain:strict}.ripple.svelte-po4fcb .animation{color:inherit;position:absolute;top:0;left:0;border-radius:50%;opacity:0;pointer-events:none;overflow:hidden;will-change:transform, opacity}.ripple.svelte-po4fcb .animation--enter{transition:none}.ripple.svelte-po4fcb .animation--in{transition:opacity 0.1s cubic-bezier(0.4, 0, 0.2, 1);transition:transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),\r\n\t\t\topacity 0.1s cubic-bezier(0.4, 0, 0.2, 1)}.ripple.svelte-po4fcb .animation--out{transition:opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)}",append(re.head,t)),init(this,e,ve,ae,safe_not_equal,{center:1,circle:2,color:3});}}function me(e){let t,n;return t=new he({props:{center:e[3],circle:e[3]}}),{c(){create_component(t.$$.fragment);},m(e,l){mount_component(t,e,l),n=!0;},p(e,n){const l={};8&n&&(l.center=e[3]),8&n&&(l.circle=e[3]),t.$set(l);},i(e){n||(transition_in(t.$$.fragment,e),n=!0);},o(e){transition_out(t.$$.fragment,e),n=!1;},d(e){destroy_component(t,e);}}}function ge(t){let n,l,i,a,d;const p=t[19].default,v=create_slot(p,t,t[18],null);let h=t[10]&&me(t),b=[{class:t[1]},{style:t[2]},t[14]],L={};for(let e=0;e<b.length;e+=1)L=assign(L,b[e]);return {c(){n=element("button"),v&&v.c(),l=space(),h&&h.c(),set_attributes(n,L),toggle_class(n,"raised",t[6]),toggle_class(n,"outlined",t[8]&&!(t[6]||t[7])),toggle_class(n,"shaped",t[9]&&!t[3]),toggle_class(n,"dense",t[5]),toggle_class(n,"fab",t[4]&&t[3]),toggle_class(n,"icon-button",t[3]),toggle_class(n,"toggle",t[11]),toggle_class(n,"active",t[11]&&t[0]),toggle_class(n,"full-width",t[12]&&!t[3]),toggle_class(n,"svelte-6bcb3a",!0);},m(s,u){insert(s,n,u),v&&v.m(n,null),append(n,l),h&&h.m(n,null),t[20](n),i=!0,a||(d=[listen(n,"click",t[16]),action_destroyer(t[15].call(null,n))],a=!0);},p(e,[t]){v&&v.p&&262144&t&&update_slot(v,p,e,e[18],t,null,null),e[10]?h?(h.p(e,t),1024&t&&transition_in(h,1)):(h=me(e),h.c(),transition_in(h,1),h.m(n,null)):h&&(group_outros(),transition_out(h,1,1,()=>{h=null;}),check_outros()),set_attributes(n,L=get_spread_update(b,[(!i||2&t)&&{class:e[1]},(!i||4&t)&&{style:e[2]},16384&t&&e[14]])),toggle_class(n,"raised",e[6]),toggle_class(n,"outlined",e[8]&&!(e[6]||e[7])),toggle_class(n,"shaped",e[9]&&!e[3]),toggle_class(n,"dense",e[5]),toggle_class(n,"fab",e[4]&&e[3]),toggle_class(n,"icon-button",e[3]),toggle_class(n,"toggle",e[11]),toggle_class(n,"active",e[11]&&e[0]),toggle_class(n,"full-width",e[12]&&!e[3]),toggle_class(n,"svelte-6bcb3a",!0);},i(e){i||(transition_in(v,e),transition_in(h),i=!0);},o(e){transition_out(v,e),transition_out(h),i=!1;},d(e){e&&detach(n),v&&v.d(e),h&&h.d(),t[20](null),a=!1,run_all(d);}}}function be(e,t,n){let l,{$$slots:o={},$$scope:i}=t;const s=createEventDispatcher(),r=oe(current_component);let a,{class:c=""}=t,{style:d=null}=t,{icon:u=!1}=t,{fab:f=!1}=t,{dense:v=!1}=t,{raised:h=!1}=t,{unelevated:m=!1}=t,{outlined:g=!1}=t,{shaped:b=!1}=t,{color:x=null}=t,{ripple:w=!0}=t,{toggle:$=!1}=t,{active:z=!1}=t,{fullWidth:k=!1}=t,D={};return beforeUpdate(()=>{if(!a)return;let e=a.getElementsByTagName("svg"),t=e.length;for(let n=0;n<t;n++)e[n].setAttribute("width",l+($&&!u?2:0)),e[n].setAttribute("height",l+($&&!u?2:0));n(13,a.style.backgroundColor=h||m?x:"transparent",a);let o=getComputedStyle(a).getPropertyValue("background-color");n(13,a.style.color=h||m?function(e="#ffffff"){let t,n,l,o,i,s;if(0===e.length&&(e="#ffffff"),e=se(e),e=String(e).replace(/[^0-9a-f]/gi,""),!new RegExp(/^(?:[0-9a-f]{3}){1,2}$/i).test(e))throw new Error("Invalid HEX color!");e.length<6&&(e=e[0]+e[0]+e[1]+e[1]+e[2]+e[2]);const r=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);return t=parseInt(r[1],16)/255,n=parseInt(r[2],16)/255,l=parseInt(r[3],16)/255,o=t<=.03928?t/12.92:Math.pow((t+.055)/1.055,2.4),i=n<=.03928?n/12.92:Math.pow((n+.055)/1.055,2.4),s=l<=.03928?l/12.92:Math.pow((l+.055)/1.055,2.4),.2126*o+.7152*i+.0722*s}(o)>.5?"#000":"#fff":x,a);}),e.$$set=e=>{n(23,t=assign(assign({},t),exclude_internal_props(e))),"class"in e&&n(1,c=e.class),"style"in e&&n(2,d=e.style),"icon"in e&&n(3,u=e.icon),"fab"in e&&n(4,f=e.fab),"dense"in e&&n(5,v=e.dense),"raised"in e&&n(6,h=e.raised),"unelevated"in e&&n(7,m=e.unelevated),"outlined"in e&&n(8,g=e.outlined),"shaped"in e&&n(9,b=e.shaped),"color"in e&&n(17,x=e.color),"ripple"in e&&n(10,w=e.ripple),"toggle"in e&&n(11,$=e.toggle),"active"in e&&n(0,z=e.active),"fullWidth"in e&&n(12,k=e.fullWidth),"$$scope"in e&&n(18,i=e.$$scope);},e.$$.update=()=>{{const{style:e,icon:l,fab:o,dense:i,raised:s,unelevated:r,outlined:a,shaped:c,color:d,ripple:u,toggle:p,active:f,fullWidth:v,...h}=t;!h.disabled&&delete h.disabled,delete h.class,n(14,D=h);}56&e.$$.dirty&&(l=u?f?24:v?20:24:v?16:18),139264&e.$$.dirty&&("primary"===x?n(17,x=ie()?"#1976d2":"var(--primary, #1976d2)"):"accent"==x?n(17,x=ie()?"#f50057":"var(--accent, #f50057)"):!x&&a&&n(17,x=a.style.color||a.parentElement.style.color||(ie()?"#333":"var(--color, #333)")));},t=exclude_internal_props(t),[z,c,d,u,f,v,h,m,g,b,w,$,k,a,D,r,function(e){$&&(n(0,z=!z),s("change",z));},x,i,o,function(e){binding_callbacks[e?"unshift":"push"](()=>{a=e,n(13,a);});}]}class ye extends SvelteComponent{constructor(e){var t;super(),document.getElementById("svelte-6bcb3a-style")||((t=element("style")).id="svelte-6bcb3a-style",t.textContent="button.svelte-6bcb3a:disabled{cursor:default}button.svelte-6bcb3a{cursor:pointer;font-family:Roboto, Helvetica, sans-serif;font-family:var(--button-font-family, Roboto, Helvetica, sans-serif);font-size:0.875rem;font-weight:500;letter-spacing:0.75px;text-decoration:none;text-transform:uppercase;will-change:transform, opacity;margin:0;padding:0 16px;display:-ms-inline-flexbox;display:inline-flex;position:relative;align-items:center;justify-content:center;box-sizing:border-box;height:36px;border:none;outline:none;line-height:inherit;user-select:none;overflow:hidden;vertical-align:middle;border-radius:4px}button.svelte-6bcb3a::-moz-focus-inner{border:0}button.svelte-6bcb3a:-moz-focusring{outline:none}button.svelte-6bcb3a:before{box-sizing:inherit;border-radius:inherit;color:inherit;bottom:0;content:'';left:0;opacity:0;pointer-events:none;position:absolute;right:0;top:0;transition:0.2s cubic-bezier(0.25, 0.8, 0.5, 1);will-change:background-color, opacity}.toggle.svelte-6bcb3a:before{box-sizing:content-box}.active.svelte-6bcb3a:before{background-color:currentColor;opacity:0.3}.raised.svelte-6bcb3a{box-shadow:0 3px 1px -2px rgba(0, 0, 0, 0.2), 0 2px 2px 0 rgba(0, 0, 0, 0.14),\r\n\t\t\t0 1px 5px 0 rgba(0, 0, 0, 0.12)}.outlined.svelte-6bcb3a{padding:0 14px;border-style:solid;border-width:2px}.shaped.svelte-6bcb3a{border-radius:18px}.dense.svelte-6bcb3a{height:32px}.icon-button.svelte-6bcb3a{line-height:0.5;border-radius:50%;padding:8px;width:40px;height:40px;vertical-align:middle}.icon-button.outlined.svelte-6bcb3a{padding:6px}.icon-button.fab.svelte-6bcb3a{border:none;width:56px;height:56px;box-shadow:0 3px 5px -1px rgba(0, 0, 0, 0.2), 0 6px 10px 0 rgba(0, 0, 0, 0.14),\r\n\t\t\t0 1px 18px 0 rgba(0, 0, 0, 0.12)}.icon-button.dense.svelte-6bcb3a{width:36px;height:36px}.icon-button.fab.dense.svelte-6bcb3a{width:40px;height:40px}.outlined.svelte-6bcb3a:not(.shaped) .ripple{border-radius:0 !important}.full-width.svelte-6bcb3a{width:100%}@media(hover: hover){button.svelte-6bcb3a:hover:not(.toggle):not([disabled]):not(.disabled):before{background-color:currentColor;opacity:0.15}button.focus-visible.svelte-6bcb3a:focus:not(.toggle):not([disabled]):not(.disabled):before{background-color:currentColor;opacity:0.3}button.focus-visible.toggle.svelte-6bcb3a:focus:not(.active):not([disabled]):not(.disabled):before{background-color:currentColor;opacity:0.15}}",append(document.head,t)),init(this,e,be,ge,safe_not_equal,{class:1,style:2,icon:3,fab:4,dense:5,raised:6,unelevated:7,outlined:8,shaped:9,color:17,ripple:10,toggle:11,active:0,fullWidth:12});}}function xe(e){let t,n,l;const o=e[3].default,i=create_slot(o,e,e[2],null);return {c(){t=element("div"),i&&i.c(),attr(t,"class","button-group svelte-x6hf3e"),attr(t,"style",n=e[0]?`color: ${e[0]};`:""+e[1]);},m(e,n){insert(e,t,n),i&&i.m(t,null),l=!0;},p(e,[s]){i&&i.p&&4&s&&update_slot(i,o,e,e[2],s,null,null),(!l||3&s&&n!==(n=e[0]?`color: ${e[0]};`:""+e[1]))&&attr(t,"style",n);},i(e){l||(transition_in(i,e),l=!0);},o(e){transition_out(i,e),l=!1;},d(e){e&&detach(t),i&&i.d(e);}}}function we(e,t,n){let{$$slots:l={},$$scope:o}=t,{color:i=""}=t,{style:s=""}=t;return e.$$set=e=>{"color"in e&&n(0,i=e.color),"style"in e&&n(1,s=e.style),"$$scope"in e&&n(2,o=e.$$scope);},e.$$.update=()=>{1&e.$$.dirty&&("primary"===i?n(0,i=ie()?"#1976d2":"var(--primary, #1976d2)"):"accent"==i&&n(0,i=ie()?"#f50057":"var(--accent, #f50057)"));},[i,s,o,l]}class $e extends SvelteComponent{constructor(e){var t;super(),document.getElementById("svelte-x6hf3e-style")||((t=element("style")).id="svelte-x6hf3e-style",t.textContent=".button-group.svelte-x6hf3e{display:inline-flex;flex-wrap:wrap}.button-group.svelte-x6hf3e button{padding:0 8px}.button-group.svelte-x6hf3e button:first-child{border-top-right-radius:0;border-bottom-right-radius:0}.button-group.svelte-x6hf3e button:last-child{border-top-left-radius:0;border-bottom-left-radius:0}.button-group.svelte-x6hf3e .shaped:first-child{padding-left:12px}.button-group.svelte-x6hf3e .shaped:last-child{padding-right:12px}.button-group.svelte-x6hf3e button:not(:first-child):not(:last-child){border-radius:0}.button-group.svelte-x6hf3e button:not(:first-child){border-left:none}.button-group.svelte-x6hf3e .outlined{border-width:1px}",append(document.head,t)),init(this,e,we,xe,safe_not_equal,{color:0,style:1});}}function ze(e){let t;const n=e[12].default,l=create_slot(n,e,e[11],null);return {c(){l&&l.c();},m(e,n){l&&l.m(e,n),t=!0;},p(e,t){l&&l.p&&2048&t&&update_slot(l,n,e,e[11],t,null,null);},i(e){t||(transition_in(l,e),t=!0);},o(e){transition_out(l,e),t=!1;},d(e){l&&l.d(e);}}}function ke(e){let t,n;return {c(){t=svg_element("svg"),n=svg_element("path"),attr(n,"d",e[1]),attr(t,"xmlns","http://www.w3.org/2000/svg"),attr(t,"viewBox",e[2]),attr(t,"class","svelte-h2unzw");},m(e,l){insert(e,t,l),append(t,n);},p(e,l){2&l&&attr(n,"d",e[1]),4&l&&attr(t,"viewBox",e[2]);},i:noop,o:noop,d(e){e&&detach(t);}}}function De(e){let t,n,l,o,r,a,d;const p=[ke,ze],f=[];function v(e,t){return "string"==typeof e[1]?0:1}n=v(e),l=f[n]=p[n](e);let h=[{class:o="icon "+e[0]},e[7]],b={};for(let e=0;e<h.length;e+=1)b=assign(b,h[e]);return {c(){t=element("i"),l.c(),set_attributes(t,b),toggle_class(t,"flip",e[3]&&"boolean"==typeof e[3]),toggle_class(t,"flip-h","h"===e[3]),toggle_class(t,"flip-v","v"===e[3]),toggle_class(t,"spin",e[4]),toggle_class(t,"pulse",e[5]&&!e[4]),toggle_class(t,"svelte-h2unzw",!0);},m(l,o){insert(l,t,o),f[n].m(t,null),e[13](t),r=!0,a||(d=action_destroyer(e[8].call(null,t)),a=!0);},p(e,[i]){let s=n;n=v(e),n===s?f[n].p(e,i):(group_outros(),transition_out(f[s],1,1,()=>{f[s]=null;}),check_outros(),l=f[n],l?l.p(e,i):(l=f[n]=p[n](e),l.c()),transition_in(l,1),l.m(t,null)),set_attributes(t,b=get_spread_update(h,[(!r||1&i&&o!==(o="icon "+e[0]))&&{class:o},128&i&&e[7]])),toggle_class(t,"flip",e[3]&&"boolean"==typeof e[3]),toggle_class(t,"flip-h","h"===e[3]),toggle_class(t,"flip-v","v"===e[3]),toggle_class(t,"spin",e[4]),toggle_class(t,"pulse",e[5]&&!e[4]),toggle_class(t,"svelte-h2unzw",!0);},i(e){r||(transition_in(l),r=!0);},o(e){transition_out(l),r=!1;},d(l){l&&detach(t),f[n].d(),e[13](null),a=!1,d();}}}function Ce(e,t,n){let{$$slots:l={},$$scope:o}=t;const i=oe(current_component);let s,{class:r=""}=t,{path:a=null}=t,{size:c=24}=t,{viewBox:d="0 0 24 24"}=t,{color:u="currentColor"}=t,{flip:f=!1}=t,{spin:v=!1}=t,{pulse:h=!1}=t,m={};return e.$$set=e=>{n(14,t=assign(assign({},t),exclude_internal_props(e))),"class"in e&&n(0,r=e.class),"path"in e&&n(1,a=e.path),"size"in e&&n(9,c=e.size),"viewBox"in e&&n(2,d=e.viewBox),"color"in e&&n(10,u=e.color),"flip"in e&&n(3,f=e.flip),"spin"in e&&n(4,v=e.spin),"pulse"in e&&n(5,h=e.pulse),"$$scope"in e&&n(11,o=e.$$scope);},e.$$.update=()=>{{const{path:e,size:l,viewBox:o,color:i,flip:s,spin:r,pulse:a,...c}=t;delete c.class,n(7,m=c);}1600&e.$$.dirty&&s&&(s.firstChild.setAttribute("width",c),s.firstChild.setAttribute("height",c),u&&s.firstChild.setAttribute("fill",u));},t=exclude_internal_props(t),[r,a,d,f,v,h,s,m,i,c,u,o,l,function(e){binding_callbacks[e?"unshift":"push"](()=>{s=e,n(6,s);});}]}class je extends SvelteComponent{constructor(e){var t;super(),document.getElementById("svelte-h2unzw-style")||((t=element("style")).id="svelte-h2unzw-style",t.textContent=".icon.svelte-h2unzw.svelte-h2unzw{display:inline-block;position:relative;vertical-align:middle;line-height:0.5}.icon.svelte-h2unzw>svg.svelte-h2unzw{display:inline-block}.flip.svelte-h2unzw.svelte-h2unzw{transform:scale(-1, -1)}.flip-h.svelte-h2unzw.svelte-h2unzw{transform:scale(-1, 1)}.flip-v.svelte-h2unzw.svelte-h2unzw{transform:scale(1, -1)}.spin.svelte-h2unzw.svelte-h2unzw{animation:svelte-h2unzw-spin 1s 0s infinite linear}.pulse.svelte-h2unzw.svelte-h2unzw{animation:svelte-h2unzw-spin 1s infinite steps(8)}@keyframes svelte-h2unzw-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}",append(document.head,t)),init(this,e,Ce,De,safe_not_equal,{class:0,path:1,size:9,viewBox:2,color:10,flip:3,spin:4,pulse:5});}}let Ie={YYYY:function(e){return ("000"+e.getFullYear()).slice(-4)},YY:function(e){return ("0"+e.getFullYear()).slice(-2)},MM:function(e){return ("0"+(e.getMonth()+1)).slice(-2)},M:function(e){return ""+(e.getMonth()+1)},DD:function(e){return ("0"+e.getDate()).slice(-2)},D:function(e){return ""+e.getDate()}},Be={YYYY:function(e){return this.exec(/^\d{4}/,e)},YY:function(e){var t=this.exec(/^\d\d/,e);return t.value+=t.value<50?2e3:1900,t},MM:function(e){return this.exec(/^\d\d/,e)},M:function(e){return this.exec(/^\d\d?/,e)},DD:function(e){return this.exec(/^\d\d/,e)},D:function(e){return this.exec(/^\d\d?/,e)},exec:function(e,t){var n=(e.exec(t)||[""])[0];return {value:0|n,length:n.length}}};function Se(e,t,n){if(isNaN(e))return "";let l=function(e,t){return function(e,t){return new Date(e.getTime()+t)}(e,6e4*t)}(e,n?e.getTimezoneOffset():0),o=Ie;return l.utc=n,t.replace(/\[[^\[\]]*]|\[.*\][^\[]*\]|([A-Za-z])\1*|./g,(function(e){return o[e]?o[e](l,t):e.replace(/\[(.*)]/,"$1")}))}function qe(e,t){let n,l,o,i=Be,s=/([A-Za-z])\1*|./g,r=0,a={Y:0,M:0,D:0,H:0,A:0,h:0,m:0,s:0,S:0,_index:0,_length:0,_match:0};for(;n=s.exec(t);)if(l=n[0],i[l]){if(o=i[l](e.slice(r),t),!o.length)break;r+=o.length,a[l.charAt(0)]=o.value,a._match++;}else {if(l!==e.charAt(r)&&" "!==l)break;r++;}return a._index=r,a._length=e.length,a}function Fe(e,t,n){let l,o=qe(e,t);return function(e,t){let n="string"==typeof e?qe(e,t):e,l=[31,28+(0|(o=n.Y,!((o%4||!(o%100))&&o%400))),31,30,31,30,31,31,30,31,30,31][n.M-1];var o;return !(n._index<1||n._length<1||n._index-n._length||n._match<1||n.Y<1||n.Y>9999||n.M<1||n.M>12||n.D<1||n.D>l)}(o)?(o.M-=o.Y<100?22801:1,l=n?new Date(Date.UTC(o.Y,o.M,o.D,o.H,o.m,o.s,o.S)):new Date(o.Y,o.M,o.D,o.H,o.m,o.s,o.S),l):new Date(NaN)}function _e(e){return "[object Date]"===Object.prototype.toString.call(e)}function He(e){let t;return {c(){t=element("span"),t.textContent="*",attr(t,"class","required svelte-1dzu4e7");},m(e,n){insert(e,t,n);},d(e){e&&detach(t);}}}function Oe(e){let t,n,l;return {c(){t=element("div"),n=space(),l=element("div"),attr(t,"class","input-line svelte-1dzu4e7"),attr(l,"class","focus-line svelte-1dzu4e7");},m(e,o){insert(e,t,o),insert(e,n,o),insert(e,l,o);},d(e){e&&detach(t),e&&detach(n),e&&detach(l);}}}function We(e){let t,n,l,o=(e[11]||e[10])+"";return {c(){t=element("div"),n=element("div"),l=text(o),attr(n,"class","message"),attr(t,"class","help svelte-1dzu4e7"),toggle_class(t,"persist",e[9]),toggle_class(t,"error",e[11]);},m(e,o){insert(e,t,o),append(t,n),append(n,l);},p(e,n){3072&n&&o!==(o=(e[11]||e[10])+"")&&set_data(l,o),512&n&&toggle_class(t,"persist",e[9]),2048&n&&toggle_class(t,"error",e[11]);},d(e){e&&detach(t);}}}function Xe(t){let n,l,i,p,f,v,h,m,g,b,k,D,C,L=[{class:"input"},t[12]],M={};for(let e=0;e<L.length;e+=1)M=assign(M,L[e]);let Y=t[2]&&!t[0].length&&He(),A=(!t[7]||t[8])&&Oe(),S=(!!t[10]||!!t[11])&&We(t);return {c(){n=element("div"),l=element("input"),i=space(),p=element("div"),f=space(),v=element("div"),h=text(t[6]),m=space(),Y&&Y.c(),g=space(),A&&A.c(),b=space(),S&&S.c(),set_attributes(l,M),toggle_class(l,"svelte-1dzu4e7",!0),attr(p,"class","focus-ring svelte-1dzu4e7"),attr(v,"class","label svelte-1dzu4e7"),attr(n,"class",k=null_to_empty(`text-field ${t[7]&&!t[8]?"outlined":"baseline"} ${t[3]}`)+" svelte-1dzu4e7"),attr(n,"style",t[4]),attr(n,"title",t[5]),toggle_class(n,"filled",t[8]),toggle_class(n,"dirty",t[13]),toggle_class(n,"disabled",t[1]);},m(s,a){insert(s,n,a),append(n,l),set_input_value(l,t[0]),append(n,i),append(n,p),append(n,f),append(n,v),append(v,h),append(v,m),Y&&Y.m(v,null),append(n,g),A&&A.m(n,null),append(n,b),S&&S.m(n,null),D||(C=[listen(l,"input",t[16]),action_destroyer(t[14].call(null,l))],D=!0);},p(e,[t]){set_attributes(l,M=get_spread_update(L,[{class:"input"},4096&t&&e[12]])),1&t&&l.value!==e[0]&&set_input_value(l,e[0]),toggle_class(l,"svelte-1dzu4e7",!0),64&t&&set_data(h,e[6]),e[2]&&!e[0].length?Y||(Y=He(),Y.c(),Y.m(v,null)):Y&&(Y.d(1),Y=null),!e[7]||e[8]?A||(A=Oe(),A.c(),A.m(n,b)):A&&(A.d(1),A=null),e[10]||e[11]?S?S.p(e,t):(S=We(e),S.c(),S.m(n,null)):S&&(S.d(1),S=null),392&t&&k!==(k=null_to_empty(`text-field ${e[7]&&!e[8]?"outlined":"baseline"} ${e[3]}`)+" svelte-1dzu4e7")&&attr(n,"class",k),16&t&&attr(n,"style",e[4]),32&t&&attr(n,"title",e[5]),392&t&&toggle_class(n,"filled",e[8]),8584&t&&toggle_class(n,"dirty",e[13]),394&t&&toggle_class(n,"disabled",e[1]);},i:noop,o:noop,d(e){e&&detach(n),Y&&Y.d(),A&&A.d(),S&&S.d(),D=!1,run_all(C);}}}function Pe(e,t,n){let l;const o=oe(current_component);let i,{value:s=""}=t,{disabled:r=!1}=t,{required:a=!1}=t,{class:c=""}=t,{style:d=null}=t,{title:u=null}=t,{label:p=""}=t,{outlined:f=!1}=t,{filled:v=!1}=t,{messagePersist:h=!1}=t,{message:m=""}=t,{error:g=""}=t,b={};const x=["date","datetime-local","email","month","number","password","search","tel","text","time","url","week"],w=["date","datetime-local","month","time","week"];return e.$$set=e=>{n(19,t=assign(assign({},t),exclude_internal_props(e))),"value"in e&&n(0,s=e.value),"disabled"in e&&n(1,r=e.disabled),"required"in e&&n(2,a=e.required),"class"in e&&n(3,c=e.class),"style"in e&&n(4,d=e.style),"title"in e&&n(5,u=e.title),"label"in e&&n(6,p=e.label),"outlined"in e&&n(7,f=e.outlined),"filled"in e&&n(8,v=e.filled),"messagePersist"in e&&n(9,h=e.messagePersist),"message"in e&&n(10,m=e.message),"error"in e&&n(11,g=e.error);},e.$$.update=()=>{{const{value:e,style:l,title:o,label:s,outlined:r,filled:a,messagePersist:c,message:d,error:u,...p}=t;!p.readonly&&delete p.readonly,!p.disabled&&delete p.disabled,delete p.class,p.type=x.indexOf(p.type)<0?"text":p.type,n(15,i=p.placeholder),n(12,b=p);}36865&e.$$.dirty&&n(13,l="string"==typeof s&&s.length>0||"number"==typeof s||i||w.indexOf(b.type)>=0);},t=exclude_internal_props(t),[s,r,a,c,d,u,p,f,v,h,m,g,b,l,o,i,function(){s=this.value,n(0,s);}]}class Ve extends SvelteComponent{constructor(e){var t;super(),document.getElementById("svelte-1dzu4e7-style")||((t=element("style")).id="svelte-1dzu4e7-style",t.textContent=".text-field.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7{font-family:Roboto, 'Segoe UI', sans-serif;font-weight:400;font-size:inherit;text-decoration:inherit;text-transform:inherit;box-sizing:border-box;margin:0 0 20px;position:relative;width:100%;background-color:inherit;will-change:opacity, transform, color}.outlined.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7{margin-top:12px}.required.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7{position:relative;top:0.175em;left:0.125em;color:#ff5252}.input.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7{box-sizing:border-box;font:inherit;width:100%;min-height:32px;background:none;text-align:left;color:#333;color:var(--color, #333);caret-color:#1976d2;caret-color:var(--primary, #1976d2);border:none;margin:0;padding:2px 0 0;outline:none}.input.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7::placeholder{color:rgba(0, 0, 0, 0.3755);color:var(--label, rgba(0, 0, 0, 0.3755));font-weight:100}.input.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7::-moz-focus-inner{padding:0;border:0}.input.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7:-moz-focusring{outline:none}.input.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7:required{box-shadow:none}.input.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7:invalid{box-shadow:none}.input.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7:active{outline:none}.input.svelte-1dzu4e7:hover~.input-line.svelte-1dzu4e7.svelte-1dzu4e7{background:#333;background:var(--color, #333)}.label.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7{font:inherit;display:inline-flex;position:absolute;left:0;top:28px;padding-right:0.2em;color:rgba(0, 0, 0, 0.3755);color:var(--label, rgba(0, 0, 0, 0.3755));background-color:inherit;pointer-events:none;-webkit-backface-visibility:hidden;backface-visibility:hidden;overflow:hidden;max-width:90%;white-space:nowrap;transform-origin:left top;transition:0.18s cubic-bezier(0.25, 0.8, 0.5, 1)}.focus-ring.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7{pointer-events:none;margin:0;padding:0;border:2px solid transparent;border-radius:4px;position:absolute;left:0;top:0;right:0;bottom:0}.input-line.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7{position:absolute;left:0;right:0;bottom:0;margin:0;height:1px;background:rgba(0, 0, 0, 0.3755);background:var(--label, rgba(0, 0, 0, 0.3755))}.focus-line.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7{position:absolute;bottom:0;left:0;right:0;height:2px;-webkit-transform:scaleX(0);transform:scaleX(0);transition:transform 0.18s cubic-bezier(0.4, 0, 0.2, 1),\r\n\t\t\topacity 0.18s cubic-bezier(0.4, 0, 0.2, 1),\r\n\t\t\t-webkit-transform 0.18s cubic-bezier(0.4, 0, 0.2, 1);transition:transform 0.18s cubic-bezier(0.4, 0, 0.2, 1),\r\n\t\t\topacity 0.18s cubic-bezier(0.4, 0, 0.2, 1);opacity:0;z-index:2;background:#1976d2;background:var(--primary, #1976d2)}.help.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7{position:absolute;left:0;right:0;bottom:-18px;display:flex;justify-content:space-between;font-size:12px;line-height:normal;letter-spacing:0.4px;color:rgba(0, 0, 0, 0.3755);color:var(--label, rgba(0, 0, 0, 0.3755));opacity:0;overflow:hidden;max-width:90%;white-space:nowrap}.persist.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7,.error.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7,.input.svelte-1dzu4e7:focus~.help.svelte-1dzu4e7.svelte-1dzu4e7{opacity:1}.error.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7{color:#ff5252}.baseline.dirty.svelte-1dzu4e7 .label.svelte-1dzu4e7.svelte-1dzu4e7{letter-spacing:0.4px;top:6px;bottom:unset;font-size:13px}.baseline.svelte-1dzu4e7 .input.svelte-1dzu4e7:focus~.label.svelte-1dzu4e7{letter-spacing:0.4px;top:6px;bottom:unset;font-size:13px;color:#1976d2;color:var(--primary, #1976d2)}.baseline.svelte-1dzu4e7 .input.svelte-1dzu4e7:focus~.focus-line.svelte-1dzu4e7{transform:scaleX(1);opacity:1}.baseline.svelte-1dzu4e7 .input.svelte-1dzu4e7.svelte-1dzu4e7{height:52px;padding-top:22px}.baseline.filled.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7{background:rgba(0, 0, 0, 0.0555);background:var(--bg-input-filled, rgba(0, 0, 0, 0.0555));border-radius:4px 4px 0 0}.baseline.filled.svelte-1dzu4e7 .label.svelte-1dzu4e7.svelte-1dzu4e7{background:none}.baseline.filled.svelte-1dzu4e7 .input.svelte-1dzu4e7.svelte-1dzu4e7,.baseline.filled.svelte-1dzu4e7 .label.svelte-1dzu4e7.svelte-1dzu4e7{padding-left:8px;padding-right:8px}.baseline.filled.svelte-1dzu4e7 .input.svelte-1dzu4e7:focus~.label.svelte-1dzu4e7{top:6px}.baseline.filled.svelte-1dzu4e7 .help.svelte-1dzu4e7.svelte-1dzu4e7{padding-left:8px}.filled.svelte-1dzu4e7 .input.svelte-1dzu4e7.svelte-1dzu4e7:hover,.filled.svelte-1dzu4e7 .input.svelte-1dzu4e7.svelte-1dzu4e7:focus{background:rgba(0, 0, 0, 0.0555);background:var(--bg-input-filled, rgba(0, 0, 0, 0.0555))}.outlined.svelte-1dzu4e7 .help.svelte-1dzu4e7.svelte-1dzu4e7{left:18px}.outlined.svelte-1dzu4e7 .input.svelte-1dzu4e7.svelte-1dzu4e7{padding:11px 16px 9px;border-radius:4px;border:1px solid;border-color:rgba(0, 0, 0, 0.3755);border-color:var(--label, rgba(0, 0, 0, 0.3755))}.outlined.svelte-1dzu4e7 .label.svelte-1dzu4e7.svelte-1dzu4e7{top:12px;bottom:unset;left:17px}.outlined.dirty.svelte-1dzu4e7 .label.svelte-1dzu4e7.svelte-1dzu4e7{top:-6px;bottom:unset;font-size:12px;letter-spacing:0.4px;padding:0 4px;left:13px}.outlined.svelte-1dzu4e7 .input.svelte-1dzu4e7.svelte-1dzu4e7:hover{border-color:#333;border-color:var(--color, #333)}.outlined.svelte-1dzu4e7 .input.svelte-1dzu4e7:focus~.label.svelte-1dzu4e7{top:-6px;bottom:unset;font-size:12px;letter-spacing:0.4px;padding:0 4px;left:13px;color:#1976d2;color:var(--primary, #1976d2)}.outlined.svelte-1dzu4e7 .input.svelte-1dzu4e7:focus~.focus-ring.svelte-1dzu4e7,.outlined.svelte-1dzu4e7 .input.focus-visible.svelte-1dzu4e7~.focus-ring.svelte-1dzu4e7{border-color:#1976d2;border-color:var(--primary, #1976d2)}",append(document.head,t)),init(this,e,Pe,Xe,safe_not_equal,{value:0,disabled:1,required:2,class:3,style:4,title:5,label:6,outlined:7,filled:8,messagePersist:9,message:10,error:11});}}function Re(e,t){if("Tab"!==e.key&&9!==e.keyCode)return;let n=function(e=document){return Array.prototype.slice.call(e.querySelectorAll('button, [href], select, textarea, input:not([type="hidden"]), [tabindex]:not([tabindex="-1"])')).filter((function(e){const t=window.getComputedStyle(e);return !e.disabled&&!e.getAttribute("disabled")&&!e.classList.contains("disabled")&&"none"!==t.display&&"hidden"!==t.visibility&&t.opacity>0}))}(t);if(0===n.length)return void e.preventDefault();let l=document.activeElement,o=n.indexOf(l);e.shiftKey?o<=0&&(n[n.length-1].focus(),e.preventDefault()):o>=n.length-1&&(n[0].focus(),e.preventDefault());}const{window:Ze}=globals;function Ue(t){let n,l,i,r,d,p,v;const h=t[17].default,b=create_slot(h,t,t[16],null);return {c(){n=element("div"),b&&b.c(),attr(n,"class",l=null_to_empty("popover "+t[1])+" svelte-5k22n0"),attr(n,"style",t[2]),attr(n,"tabindex","-1");},m(l,i){insert(l,n,i),b&&b.m(n,null),t[20](n),d=!0,p||(v=[listen(n,"introstart",t[18]),listen(n,"introend",t[19]),action_destroyer(t[4].call(null,n))],p=!0);},p(e,t){b&&b.p&&65536&t&&update_slot(b,h,e,e[16],t,null,null),(!d||2&t&&l!==(l=null_to_empty("popover "+e[1])+" svelte-5k22n0"))&&attr(n,"class",l),(!d||4&t)&&attr(n,"style",e[2]);},i(e){d||(transition_in(b,e),add_render_callback(()=>{r&&r.end(1),i||(i=create_in_transition(n,t[5],{})),i.start();}),d=!0);},o(e){transition_out(b,e),i&&i.invalidate(),r=create_out_transition(n,t[6],{}),d=!1;},d(e){e&&detach(n),b&&b.d(e),t[20](null),e&&r&&r.end(),p=!1,run_all(v);}}}function Ge(t){let n,l,o,i,s=t[0]&&Ue(t);return {c(){s&&s.c(),n=empty();},m(r,a){s&&s.m(r,a),insert(r,n,a),l=!0,o||(i=[listen(Ze,"scroll",t[8],{passive:!0}),listen(Ze,"resize",t[9],{passive:!0}),listen(Ze,"keydown",t[10],!0),listen(Ze,"click",t[11],!0)],o=!0);},p(e,[t]){e[0]?s?(s.p(e,t),1&t&&transition_in(s,1)):(s=Ue(e),s.c(),transition_in(s,1),s.m(n.parentNode,n)):s&&(group_outros(),transition_out(s,1,1,()=>{s=null;}),check_outros());},i(e){l||(transition_in(s),l=!0);},o(e){transition_out(s),l=!1;},d(e){s&&s.d(e),e&&detach(n),o=!1,run_all(i);}}}function Ke(e,t,n){let{$$slots:l={},$$scope:o}=t;const i=oe(current_component),s=createEventDispatcher();let r,a,{class:c=""}=t,{style:d=null}=t,{origin:u="top left"}=t,{dx:f=0}=t,{dy:v=0}=t,{visible:h=!1}=t,{duration:m=300}=t;async function g({target:e}){setTimeout(()=>{e.style.transitionDuration=m+"ms",e.style.transitionProperty="opacity, transform",e.style.transform="scale(1)",e.style.opacity=null;},0);}function b(){if(!h||!r||!a)return;const e=a.getBoundingClientRect();e.top<-e.height||e.top>window.innerHeight?y("overflow"):(n(3,r.style.top=function(e,t){let l=0;n(13,v=+v);const o=window.innerHeight-8-e;return l=l=u.indexOf("top")>=0?t.top+v:t.top+t.height-e-v,l=Math.min(o,l),l=Math.max(8,l),l}(r.offsetHeight,e)+"px",r),n(3,r.style.left=function(e,t){let l=0;n(12,f=+f);const o=window.innerWidth-8-e;return l=l=u.indexOf("left")>=0?t.left+f:t.left+t.width-e-f,l=Math.min(o,l),l=Math.max(8,l),l}(r.offsetWidth,e)+"px",r));}function y(e){s("close",e),n(0,h=!1);}beforeUpdate(()=>{a=r?r.parentElement:null,a&&b();});return e.$$set=e=>{"class"in e&&n(1,c=e.class),"style"in e&&n(2,d=e.style),"origin"in e&&n(14,u=e.origin),"dx"in e&&n(12,f=e.dx),"dy"in e&&n(13,v=e.dy),"visible"in e&&n(0,h=e.visible),"duration"in e&&n(15,m=e.duration),"$$scope"in e&&n(16,o=e.$$scope);},[h,c,d,r,i,function(e){return e.style.transformOrigin=u,e.style.transform="scale(0.6)",e.style.opacity="0",{duration:+m}},function(e){return e.style.transformOrigin=u,e.style.transitionDuration=m+"ms",e.style.transitionProperty="opacity, transform",e.style.transform="scale(0.6)",e.style.opacity="0",{duration:+m}},g,function(){b();},function(){b();},function(e){h&&(27===e.keyCode&&(e.stopPropagation(),y("escape")),Re(e,r));},function(e){h&&a&&!a.contains(e.target)&&(e.stopPropagation(),y("clickOutside"));},f,v,u,m,o,l,e=>g(e),e=>function({target:e}){e.style.transformOrigin=null,e.style.transitionDuration=null,e.style.transitionProperty=null,e.style.transform=null,e.focus();}(e),function(e){binding_callbacks[e?"unshift":"push"](()=>{r=e,n(3,r);});}]}class Je extends SvelteComponent{constructor(e){var t;super(),document.getElementById("svelte-5k22n0-style")||((t=element("style")).id="svelte-5k22n0-style",t.textContent=".popover.svelte-5k22n0{color:#333;color:var(--color, #333);background:#fff;background:var(--bg-popover, #fff);backface-visibility:hidden;position:fixed;border-radius:2px;max-height:100%;max-width:80%;overflow:auto;outline:none;box-shadow:0 3px 3px -2px rgba(0, 0, 0, 0.2), 0 3px 4px 0 rgba(0, 0, 0, 0.14),\r\n\t\t\t0 1px 8px 0 rgba(0, 0, 0, 0.12);z-index:50}",append(document.head,t)),init(this,e,Ke,Ge,safe_not_equal,{class:1,style:2,origin:14,dx:12,dy:13,visible:0,duration:15});}}const{document:Qe}=globals;function et(e,t,n){const l=e.slice();return l[21]=t[n],l}function tt(e,t,n){const l=e.slice();return l[24]=t[n],l[26]=n,l}function nt(e,t,n){const l=e.slice();return l[24]=t[n],l[28]=n,l}function lt(e,t,n){const l=e.slice();return l[28]=t[n],l}function ot(e){let t,n;return t=new je({props:{path:"M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"}}),{c(){create_component(t.$$.fragment);},m(e,l){mount_component(t,e,l),n=!0;},p:noop,i(e){n||(transition_in(t.$$.fragment,e),n=!0);},o(e){transition_out(t.$$.fragment,e),n=!1;},d(e){destroy_component(t,e);}}}function it(e){let t,n;return t=new je({props:{path:"M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"}}),{c(){create_component(t.$$.fragment);},m(e,l){mount_component(t,e,l),n=!0;},p:noop,i(e){n||(transition_in(t.$$.fragment,e),n=!0);},o(e){transition_out(t.$$.fragment,e),n=!1;},d(e){destroy_component(t,e);}}}function st(e){let t,n,l=e[28]+"";return {c(){t=element("span"),n=text(l),attr(t,"class","cell svelte-8rwna4");},m(e,l){insert(e,t,l),append(t,n);},p(e,t){16&t[0]&&l!==(l=e[28]+"")&&set_data(n,l);},d(e){e&&detach(t);}}}function rt(t){let n,l,o,i,d,p=(t[7][t[28]+7*t[26]].value||"")+"";return {c(){n=element("span"),l=text(p),attr(n,"tabindex",o=t[7][t[28]+7*t[26]].allowed?"0":"-1"),attr(n,"class","day-control svelte-8rwna4"),toggle_class(n,"today",ft(new Date((new Date).setFullYear(t[2],t[1],t[7][t[28]+7*t[26]].value)),t[8])),toggle_class(n,"selected",ft(new Date((new Date).setFullYear(t[2],t[1],t[7][t[28]+7*t[26]].value)),isNaN(t[3])?new Date(0):t[3])),toggle_class(n,"disabled",!t[7][t[28]+7*t[26]].allowed);},m(o,s){insert(o,n,s),append(n,l),i||(d=[listen(n,"keydown",pt),listen(n,"click",t[10])],i=!0);},p(e,t){128&t[0]&&p!==(p=(e[7][e[28]+7*e[26]].value||"")+"")&&set_data(l,p),128&t[0]&&o!==(o=e[7][e[28]+7*e[26]].allowed?"0":"-1")&&attr(n,"tabindex",o),390&t[0]&&toggle_class(n,"today",ft(new Date((new Date).setFullYear(e[2],e[1],e[7][e[28]+7*e[26]].value)),e[8])),142&t[0]&&toggle_class(n,"selected",ft(new Date((new Date).setFullYear(e[2],e[1],e[7][e[28]+7*e[26]].value)),isNaN(e[3])?new Date(0):e[3])),128&t[0]&&toggle_class(n,"disabled",!e[7][e[28]+7*e[26]].allowed);},d(e){e&&detach(n),i=!1,run_all(d);}}}function at(e){let t,n=e[7][e[28]+7*e[26]].value&&rt(e);return {c(){t=element("div"),n&&n.c(),attr(t,"class","cell svelte-8rwna4");},m(e,l){insert(e,t,l),n&&n.m(t,null);},p(e,l){e[7][e[28]+7*e[26]].value?n?n.p(e,l):(n=rt(e),n.c(),n.m(t,null)):n&&(n.d(1),n=null);},d(e){e&&detach(t),n&&n.d();}}}function ct(e){let t,n=Array(7),l=[];for(let t=0;t<n.length;t+=1)l[t]=at(nt(e,n,t));return {c(){t=element("div");for(let e=0;e<l.length;e+=1)l[e].c();attr(t,"class","row svelte-8rwna4");},m(e,n){insert(e,t,n);for(let e=0;e<l.length;e+=1)l[e].m(t,null);},p(e,o){if(1422&o[0]){let i;for(n=Array(7),i=0;i<n.length;i+=1){const s=nt(e,n,i);l[i]?l[i].p(s,o):(l[i]=at(s),l[i].c(),l[i].m(t,null));}for(;i<l.length;i+=1)l[i].d(1);l.length=n.length;}},d(e){e&&detach(t),destroy_each(l,e);}}}function dt(t,n){let l,o,i,d,p,f,v,h,m,g,b,y,w,$,z=new Intl.DateTimeFormat(n[0],{month:"long"}).format(new Date(n[2],n[1],1))+"",k=("000"+n[2]).slice(-4)+"",D=n[4],C=[];for(let e=0;e<D.length;e+=1)C[e]=st(lt(n,D,e));let j=Array(6),L=[];for(let e=0;e<j.length;e+=1)L[e]=ct(tt(n,j,e));return {key:t,first:null,c(){l=element("div"),o=element("div"),i=text(z),d=space(),p=text(k),f=space(),v=element("div");for(let e=0;e<C.length;e+=1)C[e].c();h=space();for(let e=0;e<L.length;e+=1)L[e].c();m=space(),attr(o,"class","title svelte-8rwna4"),attr(o,"tabindex","0"),attr(v,"class","weekdays svelte-8rwna4"),attr(l,"class","grid-cell svelte-8rwna4"),this.first=l;},m(t,s){insert(t,l,s),append(l,o),append(o,i),append(o,d),append(o,p),append(l,f),append(l,v);for(let e=0;e<C.length;e+=1)C[e].m(v,null);append(l,h);for(let e=0;e<L.length;e+=1)L[e].m(l,null);append(l,m),y=!0,w||($=[listen(o,"keydown",pt),listen(o,"click",n[9])],w=!0);},p(e,t){if(n=e,(!y||7&t[0])&&z!==(z=new Intl.DateTimeFormat(n[0],{month:"long"}).format(new Date(n[2],n[1],1))+"")&&set_data(i,z),(!y||4&t[0])&&k!==(k=("000"+n[2]).slice(-4)+"")&&set_data(p,k),16&t[0]){let e;for(D=n[4],e=0;e<D.length;e+=1){const l=lt(n,D,e);C[e]?C[e].p(l,t):(C[e]=st(l),C[e].c(),C[e].m(v,null));}for(;e<C.length;e+=1)C[e].d(1);C.length=D.length;}if(1422&t[0]){let e;for(j=Array(6),e=0;e<j.length;e+=1){const o=tt(n,j,e);L[e]?L[e].p(o,t):(L[e]=ct(o),L[e].c(),L[e].m(l,m));}for(;e<L.length;e+=1)L[e].d(1);L.length=j.length;}},i(e){y||(add_render_callback(()=>{b&&b.end(1),g||(g=create_in_transition(l,fly,{x:50*n[6],duration:200,delay:80})),g.start();}),y=!0);},o(e){g&&g.invalidate(),b=create_out_transition(l,fade,{duration:0===n[6]?0:160}),y=!1;},d(e){e&&detach(l),destroy_each(C,e),destroy_each(L,e),e&&b&&b.end(),w=!1,run_all($);}}}function ut(e){let t,n,l,o,i,d,p,f,y=[],w=new Map;l=new ye({props:{icon:!0,style:"z-index: 5;",disabled:e[2]<2&&e[1]<1,$$slots:{default:[ot]},$$scope:{ctx:e}}}),l.$on("click",e[14]),i=new ye({props:{icon:!0,style:"z-index: 5;",$$slots:{default:[it]},$$scope:{ctx:e}}}),i.$on("click",e[15]);let $=[0];const z=e=>e[5]?e[21]:e[2]+e[1];for(let t=0;t<1;t+=1){let n=et(e,$,t),l=z(n);w.set(l,y[t]=dt(l,n));}return {c(){t=element("div"),n=element("div"),create_component(l.$$.fragment),o=space(),create_component(i.$$.fragment),d=space(),p=element("div");for(let e=0;e<1;e+=1)y[e].c();attr(n,"class","toolbar svelte-8rwna4"),attr(p,"class","grid svelte-8rwna4"),attr(t,"class","view svelte-8rwna4");},m(e,s){insert(e,t,s),append(t,n),mount_component(l,n,null),append(n,o),mount_component(i,n,null),append(t,d),append(t,p);for(let e=0;e<1;e+=1)y[e].m(p,null);f=!0;},p(e,t){const n={};6&t[0]&&(n.disabled=e[2]<2&&e[1]<1),1&t[1]&&(n.$$scope={dirty:t,ctx:e}),l.$set(n);const o={};1&t[1]&&(o.$$scope={dirty:t,ctx:e}),i.$set(o),2047&t[0]&&($=[0],group_outros(),y=update_keyed_each(y,t,z,1,e,$,w,p,outro_and_destroy_block,dt,null,et),check_outros());},i(e){if(!f){transition_in(l.$$.fragment,e),transition_in(i.$$.fragment,e);for(let e=0;e<1;e+=1)transition_in(y[e]);f=!0;}},o(e){transition_out(l.$$.fragment,e),transition_out(i.$$.fragment,e);for(let e=0;e<1;e+=1)transition_out(y[e]);f=!1;},d(e){e&&detach(t),destroy_component(l),destroy_component(i);for(let e=0;e<1;e+=1)y[e].d();}}}function pt(e){if(13===e.keyCode||32===e.keyCode){e.stopPropagation(),e.preventDefault();const t=new MouseEvent("click",{bubbles:!0,cancelable:!0});e.target.dispatchEvent(t),e.target.blur();}}function ft(e,t){return e&&t&&e.getFullYear()===t.getFullYear()&&e.getMonth()===t.getMonth()&&e.getDate()===t.getDate()}function vt(e,t,n){let{locale:l}=t,{isAllowed:o=(()=>!0)}=t,{value:i}=t,{month:s}=t,{year:r}=t,a=0,c=!1,d=0;const u=createEventDispatcher(),p=new Date;p.setHours(0,0,0,0);const f="af ar-tn az be bg bm br bs ca cs cv cy da de-at de-ch de el en-SG en-au en-gb en-ie en-nz eo es-do es et eu fi fo fr-ch fr fy ga gd gl gom-latn hr hu hy-am id is it-ch it jv ka kk km ky lb lt lv me mi mk ms-my ms mt my nb nl-be nl nn oc-lnc pl pt-br pt ro ru sd se sk sl sq sr-cyrl sr ss sv sw tet tg tl-ph tlh tr tzl ug-cn uk ur uz-latn uz vi x-pseudo yo zh-cn".split(" "),v="ar-ly ar-ma ar ku tzm-latn tzm".split(" ");let h=[],m=[];onMount(()=>{n(5,c="string"!=typeof document.createElement("div").style.grid),l||n(0,l=navigator.languages&&navigator.languages.length?navigator.languages[0]:navigator.userLanguage||navigator.language||navigator.browserLanguage||"ru");});const g=(e,t,n)=>!n||o(new Date(e,t,n)),b=(e,t)=>{const n=Array.from({length:42}),l=new Date(e,t+1,0).getDate();let o=new Date(e,t,1).getDay();return o<a&&(o+=7),Array.from({length:l}).forEach((e,t)=>{n[o+t-a]=t+1;}),n};function y(e){let t=new Date((new Date).setFullYear(r,s,1));t.setMonth(t.getMonth()+e),n(1,s=t.getMonth()),n(2,r=t.getFullYear()),n(6,d=e);}return e.$$set=e=>{"locale"in e&&n(0,l=e.locale),"isAllowed"in e&&n(12,o=e.isAllowed),"value"in e&&n(3,i=e.value),"month"in e&&n(1,s=e.month),"year"in e&&n(2,r=e.year);},e.$$.update=()=>{if(8215&e.$$.dirty[0]&&l){f.indexOf(l.toLowerCase())>=0?n(13,a=1):v.indexOf(l.toLowerCase())>=0?n(13,a=6):f.indexOf(l.split("-")[0].toLowerCase())>=0?n(13,a=1):v.indexOf(l.split("-")[0].toLowerCase())>=0?n(13,a=6):n(13,a=0),n(4,h.length=0,h);let e=new Date(0);for(let t=0;t<7;t++)e.setDate(4+a+t),h.push(new Intl.DateTimeFormat(l,{weekday:"narrow"}).format(e));n(7,m=b(r,s).map(e=>({value:e,allowed:g(r,s,e)})));}6&e.$$.dirty[0]&&n(7,m=b(r,s).map(e=>({value:e,allowed:g(r,s,e)})));},[l,s,r,i,h,c,d,m,p,function(){n(6,d=0),u("changeView",{type:"month"});},function(e){isNaN(i)?n(3,i=new Date(r,s,+e.target.innerText)):i.setFullYear(r,s,+e.target.innerText),n(3,i),u("select",i);},y,o,a,()=>{y(-1);},()=>{y(1);}]}class ht extends SvelteComponent{constructor(e){var t;super(),Qe.getElementById("svelte-8rwna4-style")||((t=element("style")).id="svelte-8rwna4-style",t.textContent=".view.svelte-8rwna4.svelte-8rwna4{position:relative;padding:0 8px 4px}.toolbar.svelte-8rwna4.svelte-8rwna4{padding:0 5px;display:flex;align-items:center;justify-content:space-between;position:absolute;height:48px;top:0;right:0;left:0}.grid.svelte-8rwna4.svelte-8rwna4{width:100%;overflow:hidden;user-select:none;display:-ms-grid;display:grid;-ms-grid-columns:1fr;-ms-grid-rows:1fr}.grid-cell.svelte-8rwna4.svelte-8rwna4{position:relative;z-index:3;-ms-grid-column:1;grid-column:1;-ms-grid-row:1;grid-row:1}.grid-cell.svelte-8rwna4.svelte-8rwna4:nth-child(2){-ms-grid-row:1;grid-row:1}.title.svelte-8rwna4.svelte-8rwna4{height:48px;font-size:16px;letter-spacing:0.75px;text-align:center;margin:0 48px;outline:none;cursor:pointer;display:flex;align-items:center;justify-content:center}.title.svelte-8rwna4.svelte-8rwna4:focus,.title.svelte-8rwna4.svelte-8rwna4:hover,.title.svelte-8rwna4.svelte-8rwna4:active{color:#1976d2;color:var(--primary, #1976d2)}.weekdays.svelte-8rwna4.svelte-8rwna4{display:flex;justify-content:space-between;font-weight:500;margin:8px 0;opacity:0.5}.row.svelte-8rwna4.svelte-8rwna4{display:flex;justify-content:space-between;text-align:center;margin-bottom:2px}.cell.svelte-8rwna4.svelte-8rwna4{position:relative;width:34px;height:34px;user-select:none}.weekdays.svelte-8rwna4 .cell.svelte-8rwna4{text-align:center;width:36px;height:unset}.day-control.svelte-8rwna4.svelte-8rwna4{font-size:14px;font-weight:500;display:block;box-sizing:border-box;cursor:pointer;width:34px;height:34px;line-height:34px;border-radius:50%}.day-control.today.svelte-8rwna4.svelte-8rwna4{border:1px solid;border-color:#1976d2;border-color:var(--primary, #1976d2);color:#1976d2;color:var(--primary, #1976d2);line-height:32px}.day-control.selected.svelte-8rwna4.svelte-8rwna4{background:#1976d2;background:var(--primary, #1976d2);color:#fff;color:var(--alternate, #fff);font-weight:700}.day-control.svelte-8rwna4.svelte-8rwna4:focus{outline:none}.day-control.svelte-8rwna4.svelte-8rwna4:before{border-radius:inherit;color:inherit;bottom:0;content:'';left:0;opacity:0;pointer-events:none;position:absolute;right:0;top:0;transition:0.4s cubic-bezier(0.25, 0.8, 0.5, 1);will-change:background-color, opacity}@media(hover: hover){.day-control.svelte-8rwna4.svelte-8rwna4:hover:not([disabled]):not(.disabled):before{background-color:currentColor;opacity:0.15}.focus-visible.day-control:focus:not([disabled]):not(.disabled):before{background-color:currentColor;opacity:0.3}}",append(Qe.head,t)),init(this,e,vt,ut,safe_not_equal,{locale:0,isAllowed:12,value:3,month:1,year:2},[-1,-1]);}}const{document:mt}=globals;function gt(e,t,n){const l=e.slice();return l[12]=t[n],l}function bt(e,t,n){const l=e.slice();return l[15]=t[n],l[17]=n,l}function yt(e,t,n){const l=e.slice();return l[15]=t[n],l[19]=n,l}function xt(e){let t,n;return t=new je({props:{path:"M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"}}),{c(){create_component(t.$$.fragment);},m(e,l){mount_component(t,e,l),n=!0;},p:noop,i(e){n||(transition_in(t.$$.fragment,e),n=!0);},o(e){transition_out(t.$$.fragment,e),n=!1;},d(e){destroy_component(t,e);}}}function wt(e){let t,n;return t=new je({props:{path:"M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"}}),{c(){create_component(t.$$.fragment);},m(e,l){mount_component(t,e,l),n=!0;},p:noop,i(e){n||(transition_in(t.$$.fragment,e),n=!0);},o(e){transition_out(t.$$.fragment,e),n=!1;},d(e){destroy_component(t,e);}}}function $t(t){let n,l,o,i,d,p=new Intl.DateTimeFormat(t[1],{month:"short"}).format(new Date((new Date).setFullYear(t[0],3*t[17]+t[19],1)))+"";function f(){return t[10](t[17],t[19])}return {c(){n=element("div"),l=element("span"),o=text(p),attr(l,"tabindex","0"),attr(l,"class","month-control svelte-2u9e0a"),toggle_class(l,"selected",jt(new Date((new Date).setFullYear(t[0],3*t[17]+t[19],1)),isNaN(t[2])?new Date(0):t[2])),attr(n,"class","cell svelte-2u9e0a");},m(t,s){insert(t,n,s),append(n,l),append(l,o),i||(d=[listen(l,"keydown",Ct),listen(l,"click",f)],i=!0);},p(e,n){t=e,3&n&&p!==(p=new Intl.DateTimeFormat(t[1],{month:"short"}).format(new Date((new Date).setFullYear(t[0],3*t[17]+t[19],1)))+"")&&set_data(o,p),5&n&&toggle_class(l,"selected",jt(new Date((new Date).setFullYear(t[0],3*t[17]+t[19],1)),isNaN(t[2])?new Date(0):t[2]));},d(e){e&&detach(n),i=!1,run_all(d);}}}function zt(e){let t,n,l=Array(3),o=[];for(let t=0;t<l.length;t+=1)o[t]=$t(yt(e,l,t));return {c(){t=element("div");for(let e=0;e<o.length;e+=1)o[e].c();n=space(),attr(t,"class","row svelte-2u9e0a");},m(e,l){insert(e,t,l);for(let e=0;e<o.length;e+=1)o[e].m(t,null);append(t,n);},p(e,i){if(71&i){let s;for(l=Array(3),s=0;s<l.length;s+=1){const r=yt(e,l,s);o[s]?o[s].p(r,i):(o[s]=$t(r),o[s].c(),o[s].m(t,n));}for(;s<o.length;s+=1)o[s].d(1);o.length=l.length;}},d(e){e&&detach(t),destroy_each(o,e);}}}function kt(t,n){let l,o,i,d,p,f,v,h,m,g,b,y=("000"+n[0]).slice(-4)+"",w=Array(4),$=[];for(let e=0;e<w.length;e+=1)$[e]=zt(bt(n,w,e));return {key:t,first:null,c(){l=element("div"),o=element("div"),i=text(y),d=space(),p=element("div");for(let e=0;e<$.length;e+=1)$[e].c();f=space(),attr(o,"class","title svelte-2u9e0a"),attr(o,"tabindex","0"),attr(p,"class","months svelte-2u9e0a"),attr(l,"class","grid-cell svelte-2u9e0a"),this.first=l;},m(t,s){insert(t,l,s),append(l,o),append(o,i),append(l,d),append(l,p);for(let e=0;e<$.length;e+=1)$[e].m(p,null);append(l,f),m=!0,g||(b=[listen(o,"keydown",Ct),listen(o,"click",n[5])],g=!0);},p(e,t){if(n=e,(!m||1&t)&&y!==(y=("000"+n[0]).slice(-4)+"")&&set_data(i,y),71&t){let e;for(w=Array(4),e=0;e<w.length;e+=1){const l=bt(n,w,e);$[e]?$[e].p(l,t):($[e]=zt(l),$[e].c(),$[e].m(p,null));}for(;e<$.length;e+=1)$[e].d(1);$.length=w.length;}},i(e){m||(add_render_callback(()=>{h&&h.end(1),v||(v=create_in_transition(l,fly,{x:50*n[4],duration:200,delay:80})),v.start();}),m=!0);},o(e){v&&v.invalidate(),h=create_out_transition(l,fade,{duration:0===n[4]?0:160}),m=!1;},d(e){e&&detach(l),destroy_each($,e),e&&h&&h.end(),g=!1,run_all(b);}}}function Dt(e){let t,n,l,o,i,d,p,f,y=[],w=new Map;l=new ye({props:{icon:!0,style:"z-index: 5;",disabled:e[0]<2,$$slots:{default:[xt]},$$scope:{ctx:e}}}),l.$on("click",e[8]),i=new ye({props:{icon:!0,style:"z-index: 5;",$$slots:{default:[wt]},$$scope:{ctx:e}}}),i.$on("click",e[9]);let $=[0];const z=e=>e[3]?e[12]:e[0];for(let t=0;t<1;t+=1){let n=gt(e,$,t),l=z(n);w.set(l,y[t]=kt(l,n));}return {c(){t=element("div"),n=element("div"),create_component(l.$$.fragment),o=space(),create_component(i.$$.fragment),d=space(),p=element("div");for(let e=0;e<1;e+=1)y[e].c();attr(n,"class","toolbar svelte-2u9e0a"),attr(p,"class","grid svelte-2u9e0a"),attr(t,"class","view svelte-2u9e0a");},m(e,s){insert(e,t,s),append(t,n),mount_component(l,n,null),append(n,o),mount_component(i,n,null),append(t,d),append(t,p);for(let e=0;e<1;e+=1)y[e].m(p,null);f=!0;},p(e,[t]){const n={};1&t&&(n.disabled=e[0]<2),1048576&t&&(n.$$scope={dirty:t,ctx:e}),l.$set(n);const o={};1048576&t&&(o.$$scope={dirty:t,ctx:e}),i.$set(o),127&t&&($=[0],group_outros(),y=update_keyed_each(y,t,z,1,e,$,w,p,outro_and_destroy_block,kt,null,gt),check_outros());},i(e){if(!f){transition_in(l.$$.fragment,e),transition_in(i.$$.fragment,e);for(let e=0;e<1;e+=1)transition_in(y[e]);f=!0;}},o(e){transition_out(l.$$.fragment,e),transition_out(i.$$.fragment,e);for(let e=0;e<1;e+=1)transition_out(y[e]);f=!1;},d(e){e&&detach(t),destroy_component(l),destroy_component(i);for(let e=0;e<1;e+=1)y[e].d();}}}function Ct(e){if(13===e.keyCode||32===e.keyCode){e.stopPropagation(),e.preventDefault();const t=new MouseEvent("click",{bubbles:!0,cancelable:!0});e.target.dispatchEvent(t),e.target.blur();}}function jt(e,t){return e&&t&&e.getFullYear()===t.getFullYear()&&e.getMonth()===t.getMonth()}function Et(e,t,n){let{locale:l}=t,{year:o}=t,{value:i}=t,s=!1,r=0;const a=createEventDispatcher();function c(e){n(4,r=0),a("select",{month:e,year:o});}function d(e){let t=new Date((new Date).setFullYear(o,0,1));t.setFullYear(t.getFullYear()+e),n(0,o=t.getFullYear()),n(4,r=e);}onMount(()=>{n(3,s="string"!=typeof document.createElement("div").style.grid);});return e.$$set=e=>{"locale"in e&&n(1,l=e.locale),"year"in e&&n(0,o=e.year),"value"in e&&n(2,i=e.value);},[o,l,i,s,r,function(){n(4,r=0),a("changeView",{type:"year"});},c,d,()=>{d(-1);},()=>{d(1);},(e,t)=>{c(3*e+t);}]}class Lt extends SvelteComponent{constructor(e){var t;super(),mt.getElementById("svelte-2u9e0a-style")||((t=element("style")).id="svelte-2u9e0a-style",t.textContent=".view.svelte-2u9e0a{position:relative;padding:0 8px 4px;height:100%}.toolbar.svelte-2u9e0a{padding:0 5px;display:flex;align-items:center;justify-content:space-between;position:absolute;height:48px;top:0;right:0;left:0}.grid.svelte-2u9e0a{width:100%;height:100%;overflow:hidden;user-select:none;display:-ms-grid;display:grid;-ms-grid-columns:1fr;-ms-grid-rows:1fr}.grid-cell.svelte-2u9e0a{position:relative;display:flex;flex-direction:column;justify-content:space-between;z-index:3;-ms-grid-column:1;grid-column:1;-ms-grid-row:1;grid-row:1;height:100%}.grid-cell.svelte-2u9e0a:nth-child(2){-ms-grid-row:1;grid-row:1}.title.svelte-2u9e0a{height:48px;font-size:16px;letter-spacing:0.75px;text-align:center;margin:0 48px;outline:none;cursor:pointer;display:flex;align-items:center;justify-content:center}.title.svelte-2u9e0a:focus,.title.svelte-2u9e0a:hover,.title.svelte-2u9e0a:active{color:#1976d2;color:var(--primary, #1976d2)}.months.svelte-2u9e0a{flex:1;display:flex;flex-direction:column;justify-content:space-around}.row.svelte-2u9e0a{display:flex;justify-content:space-around;text-align:center;margin-bottom:2px}.cell.svelte-2u9e0a{position:relative;height:34px;width:30%;overflow:hidden;user-select:none}.month-control.svelte-2u9e0a{display:block;box-sizing:border-box;cursor:pointer;line-height:34px;border-radius:2px}.month-control.selected.svelte-2u9e0a{background:#1976d2;background:var(--primary, #1976d2);color:#fff;color:var(--alternate, #fff);font-weight:700}.month-control.svelte-2u9e0a:focus{outline:none}.month-control.svelte-2u9e0a:before{border-radius:inherit;color:inherit;bottom:0;content:'';left:0;opacity:0;pointer-events:none;position:absolute;right:0;top:0;transition:0.4s cubic-bezier(0.25, 0.8, 0.5, 1);will-change:background-color, opacity}@media(hover: hover){.month-control.svelte-2u9e0a:hover:not([disabled]):not(.disabled):before{background-color:currentColor;opacity:0.15}.focus-visible.month-control:focus:not([disabled]):not(.disabled):before{background-color:currentColor;opacity:0.3}}",append(mt.head,t)),init(this,e,Et,Dt,safe_not_equal,{locale:1,year:0,value:2});}}function Mt(e,t,n){const l=e.slice();return l[5]=t[n],l[7]=n,l}function Yt(e,t,n){const l=e.slice();return l[5]=t[n],l[7]=n,l}function At(e){let t,n,l=e[0]-100+e[7]+"";return {c(){t=element("li"),n=text(l),attr(t,"class","svelte-vtkzqu");},m(e,l){insert(e,t,l),append(t,n);},p(e,t){1&t&&l!==(l=e[0]-100+e[7]+"")&&set_data(n,l);},d(e){e&&detach(t);}}}function Tt(e){let t,n=e[0]-100+e[7]>0&&At(e);return {c(){n&&n.c(),t=empty();},m(e,l){n&&n.m(e,l),insert(e,t,l);},p(e,l){e[0]-100+e[7]>0?n?n.p(e,l):(n=At(e),n.c(),n.m(t.parentNode,t)):n&&(n.d(1),n=null);},d(e){n&&n.d(e),e&&detach(t);}}}function Nt(e){let t,n,l=e[0]+1+e[7]+"";return {c(){t=element("li"),n=text(l),attr(t,"class","svelte-vtkzqu");},m(e,l){insert(e,t,l),append(t,n);},p(e,t){1&t&&l!==(l=e[0]+1+e[7]+"")&&set_data(n,l);},d(e){e&&detach(t);}}}function It(t){let n,l,o,i,p,f,v,h=Array(100),m=[];for(let e=0;e<h.length;e+=1)m[e]=Tt(Yt(t,h,e));let g=Array(100),b=[];for(let e=0;e<g.length;e+=1)b[e]=Nt(Mt(t,g,e));return {c(){n=element("ul");for(let e=0;e<m.length;e+=1)m[e].c();l=space(),o=element("li"),i=text(t[0]),p=space();for(let e=0;e<b.length;e+=1)b[e].c();attr(o,"class","active svelte-vtkzqu"),attr(n,"class","svelte-vtkzqu");},m(s,a){insert(s,n,a);for(let e=0;e<m.length;e+=1)m[e].m(n,null);append(n,l),append(n,o),append(o,i),append(n,p);for(let e=0;e<b.length;e+=1)b[e].m(n,null);t[3](n),f||(v=listen(n,"click",stop_propagation(t[2])),f=!0);},p(e,[t]){if(1&t){let o;for(h=Array(100),o=0;o<h.length;o+=1){const i=Yt(e,h,o);m[o]?m[o].p(i,t):(m[o]=Tt(i),m[o].c(),m[o].m(n,l));}for(;o<m.length;o+=1)m[o].d(1);m.length=h.length;}if(1&t&&set_data(i,e[0]),1&t){let l;for(g=Array(100),l=0;l<g.length;l+=1){const o=Mt(e,g,l);b[l]?b[l].p(o,t):(b[l]=Nt(o),b[l].c(),b[l].m(n,null));}for(;l<b.length;l+=1)b[l].d(1);b.length=g.length;}},i:noop,o:noop,d(e){e&&detach(n),destroy_each(m,e),destroy_each(b,e),t[3](null),f=!1,v();}}}function Bt(e,t,n){let l,{year:o}=t;const i=createEventDispatcher();return onMount(()=>{l&&n(1,l.scrollTop=l.scrollHeight/2-l.offsetHeight/2+16,l);}),e.$$set=e=>{"year"in e&&n(0,o=e.year);},[o,l,function({target:e}){"LI"===e.nodeName&&i("select",{year:e.textContent});},function(e){binding_callbacks[e?"unshift":"push"](()=>{l=e,n(1,l);});}]}class St extends SvelteComponent{constructor(e){var t;super(),document.getElementById("svelte-vtkzqu-style")||((t=element("style")).id="svelte-vtkzqu-style",t.textContent="ul.svelte-vtkzqu{height:inherit;overflow:auto;margin:0;padding:0;list-style:none;font-size:16px;line-height:1.3;text-align:center}li.svelte-vtkzqu{cursor:pointer;padding:8px 0}li.svelte-vtkzqu:hover{background:rgba(0, 0, 0, 0.1);background:var(--divider, rgba(0, 0, 0, 0.1))}.active.svelte-vtkzqu{color:#1976d2;color:var(--primary, #1976d2);font-size:26px;padding:4px 0 3px}",append(document.head,t)),init(this,e,Bt,It,safe_not_equal,{year:0});}}function qt(e){let t,n;function l(e,t){return (null==n||1&t)&&(n=!isNaN(e[0])),n?_t:Ft}let o=l(e,-1),i=o(e);return {c(){t=element("div"),i.c(),attr(t,"class","header svelte-1oewv3g");},m(e,n){insert(e,t,n),i.m(t,null);},p(e,n){o===(o=l(e,n))&&i?i.p(e,n):(i.d(1),i=o(e),i&&(i.c(),i.m(t,null)));},d(e){e&&detach(t),i.d();}}}function Ft(e){let t,n,l;return {c(){t=element("div"),t.textContent=" ",n=space(),l=element("div"),l.textContent="No Date",attr(t,"class","year svelte-1oewv3g"),attr(l,"class","date svelte-1oewv3g");},m(e,o){insert(e,t,o),insert(e,n,o),insert(e,l,o);},p:noop,d(e){e&&detach(t),e&&detach(n),e&&detach(l);}}}function _t(e){let t,n,l,o,i,d,p=("000"+e[0].getFullYear()).slice(-4)+"",f=new Intl.DateTimeFormat(e[1],{weekday:"short",month:"short",day:"numeric"}).format(e[0])+"";return {c(){t=element("div"),n=text(p),l=space(),o=element("div"),i=element("div"),d=text(f),attr(t,"class","year svelte-1oewv3g"),attr(i,"class","date svelte-1oewv3g"),attr(o,"class","wrap svelte-1oewv3g");},m(e,s){insert(e,t,s),append(t,n),insert(e,l,s),insert(e,o,s),append(o,i),append(i,d);},p(e,t){1&t&&p!==(p=("000"+e[0].getFullYear()).slice(-4)+"")&&set_data(n,p),3&t&&f!==(f=new Intl.DateTimeFormat(e[1],{weekday:"short",month:"short",day:"numeric"}).format(e[0])+"")&&set_data(d,f);},d(e){e&&detach(t),e&&detach(l),e&&detach(o);}}}function Ht(e){let t,n,l,o;function i(t){e[14](t);}function s(t){e[15](t);}let r={locale:e[1],isAllowed:e[2],value:e[0]};return void 0!==e[6]&&(r.month=e[6]),void 0!==e[7]&&(r.year=e[7]),t=new ht({props:r}),binding_callbacks.push(()=>bind(t,"month",i)),binding_callbacks.push(()=>bind(t,"year",s)),t.$on("select",e[12]),t.$on("changeView",e[9]),{c(){create_component(t.$$.fragment);},m(e,n){mount_component(t,e,n),o=!0;},p(e,o){const i={};2&o&&(i.locale=e[1]),4&o&&(i.isAllowed=e[2]),1&o&&(i.value=e[0]),!n&&64&o&&(n=!0,i.month=e[6],add_flush_callback(()=>n=!1)),!l&&128&o&&(l=!0,i.year=e[7],add_flush_callback(()=>l=!1)),t.$set(i);},i(e){o||(transition_in(t.$$.fragment,e),o=!0);},o(e){transition_out(t.$$.fragment,e),o=!1;},d(e){destroy_component(t,e);}}}function Ot(e){let t,n,l;function o(t){e[13](t);}let i={locale:e[1],value:e[0]};return void 0!==e[7]&&(i.year=e[7]),t=new Lt({props:i}),binding_callbacks.push(()=>bind(t,"year",o)),t.$on("select",e[11]),t.$on("changeView",e[9]),{c(){create_component(t.$$.fragment);},m(e,n){mount_component(t,e,n),l=!0;},p(e,l){const o={};2&l&&(o.locale=e[1]),1&l&&(o.value=e[0]),!n&&128&l&&(n=!0,o.year=e[7],add_flush_callback(()=>n=!1)),t.$set(o);},i(e){l||(transition_in(t.$$.fragment,e),l=!0);},o(e){transition_out(t.$$.fragment,e),l=!1;},d(e){destroy_component(t,e);}}}function Wt(e){let t,n;return t=new St({props:{year:e[7]}}),t.$on("select",e[10]),{c(){create_component(t.$$.fragment);},m(e,l){mount_component(t,e,l),n=!0;},p(e,n){const l={};128&n&&(l.year=e[7]),t.$set(l);},i(e){n||(transition_in(t.$$.fragment,e),n=!0);},o(e){transition_out(t.$$.fragment,e),n=!1;},d(e){destroy_component(t,e);}}}function Xt(e){let t,n,l,o,i,p,f,v,h=e[3]&&qt(e);const b=[Wt,Ot,Ht],y=[];function w(e,t){return "year"===e[5]?0:"month"===e[5]?1:2}return o=w(e),i=y[o]=b[o](e),{c(){t=element("div"),h&&h.c(),n=space(),l=element("div"),i.c(),attr(l,"class","body svelte-1oewv3g"),attr(t,"class","datepicker svelte-1oewv3g");},m(i,s){insert(i,t,s),h&&h.m(t,null),append(t,n),append(t,l),y[o].m(l,null),e[16](l),p=!0,f||(v=action_destroyer(e[8].call(null,t)),f=!0);},p(e,[s]){e[3]?h?h.p(e,s):(h=qt(e),h.c(),h.m(t,n)):h&&(h.d(1),h=null);let r=o;o=w(e),o===r?y[o].p(e,s):(group_outros(),transition_out(y[r],1,1,()=>{y[r]=null;}),check_outros(),i=y[o],i?i.p(e,s):(i=y[o]=b[o](e),i.c()),transition_in(i,1),i.m(l,null));},i(e){p||(transition_in(i),p=!0);},o(e){transition_out(i),p=!1;},d(n){n&&detach(t),h&&h.d(),y[o].d(),e[16](null),f=!1,v();}}}function Pt(e,t,n){let{locale:l}=t,{isAllowed:o=(()=>!0)}=t,{header:i=!0}=t,{value:s}=t;const r=oe(current_component),a=createEventDispatcher();let c,d,u,f="days";_e(s)||(s=new Date(NaN));let v=isNaN(s)?new Date:new Date(s.getTime());return c=v.getMonth(),d=v.getFullYear(),e.$$set=e=>{"locale"in e&&n(1,l=e.locale),"isAllowed"in e&&n(2,o=e.isAllowed),"header"in e&&n(3,i=e.header),"value"in e&&n(0,s=e.value);},e.$$.update=()=>{16&e.$$.dirty&&u&&setTimeout(()=>{n(4,u.style.height=u.offsetHeight+"px",u),n(4,u.style.width=u.offsetWidth+"px",u);},0);},[s,l,o,i,u,f,c,d,r,function({detail:e}){n(5,f=e.type);},function({detail:e}){n(7,d=+e.year),n(5,f="days");},function({detail:e}){n(6,c=+e.month),n(7,d=+e.year),n(5,f="days");},function({detail:e}){n(0,s=new Date(e.getTime())),a("select",s);},function(e){d=e,n(7,d);},function(e){c=e,n(6,c);},function(e){d=e,n(7,d);},function(e){binding_callbacks[e?"unshift":"push"](()=>{u=e,n(4,u);});}]}class Vt extends SvelteComponent{constructor(e){var t;super(),document.getElementById("svelte-1oewv3g-style")||((t=element("style")).id="svelte-1oewv3g-style",t.textContent=".datepicker.svelte-1oewv3g.svelte-1oewv3g{position:relative;overflow:hidden}.header.svelte-1oewv3g.svelte-1oewv3g{box-sizing:border-box;color:#fff;color:var(--alternate, #fff);background:#1976d2;background:var(--primary, #1976d2);padding:16px;height:97px}.wrap.svelte-1oewv3g.svelte-1oewv3g{position:relative}.wrap.svelte-1oewv3g .date.svelte-1oewv3g{position:absolute;left:0;top:0;width:100%;overflow:hidden;white-space:nowrap}.year.svelte-1oewv3g.svelte-1oewv3g{font-size:16px;font-weight:700;opacity:0.6;margin-bottom:8px}.date.svelte-1oewv3g.svelte-1oewv3g{font-size:34px;font-weight:500}.body.svelte-1oewv3g.svelte-1oewv3g{overflow:hidden}@media only screen and (max-height: 400px) and (min-width: 420px){.datepicker.svelte-1oewv3g.svelte-1oewv3g{display:flex}.header.svelte-1oewv3g.svelte-1oewv3g{height:auto;width:148px}.wrap.svelte-1oewv3g .date.svelte-1oewv3g{white-space:unset}}",append(document.head,t)),init(this,e,Pt,Xt,safe_not_equal,{locale:1,isAllowed:2,header:3,value:0});}}const{document:Rt}=globals;function Zt(e){let t,n;return t=new je({props:{viewBox:"0 0 24 18",path:"M2,4 L16,4 L16,5 L2,5 L2,4 Z M4,9 L9,9 L9,14 L4,14 L4,9 Z M16,18 L2,18 L2,7 L16,7\r\n\t\t\tL16,18 Z M16,2 L15,2 L15,0 L13,0 L13,2 L5,2 L5,0 L3,0 L3,2 L2,2 C0.89,2 0,2.9 0,4 L0,18\r\n\t\t\tC0,19.1045695 0.8954305,20 2,20 L16,20 C17.1045695,20 18,19.1045695 18,18 L18,4\r\n\t\t\tC18,2.8954305 17.1045695,2 16,2 Z"}}),t.$on("click",e[12]),{c(){create_component(t.$$.fragment);},m(e,l){mount_component(t,e,l),n=!0;},p:noop,i(e){n||(transition_in(t.$$.fragment,e),n=!0);},o(e){transition_out(t.$$.fragment,e),n=!1;},d(e){destroy_component(t,e);}}}function Ut(e){let t,n;return t=new je({props:{size:"21",style:"margin: 0 0 0 -20px;",viewBox:"0 0 24 20",path:"M7 10l5 5 5-5z"}}),t.$on("click",e[12]),{c(){create_component(t.$$.fragment);},m(e,l){mount_component(t,e,l),n=!0;},p:noop,i(e){n||(transition_in(t.$$.fragment,e),n=!0);},o(e){transition_out(t.$$.fragment,e),n=!1;},d(e){destroy_component(t,e);}}}function Gt(e){let t,n;return t=new Vt({props:{locale:e[1],isAllowed:e[3],value:e[8]}}),t.$on("select",e[13]),{c(){create_component(t.$$.fragment);},m(e,l){mount_component(t,e,l),n=!0;},p(e,n){const l={};2&n[0]&&(l.locale=e[1]),8&n[0]&&(l.isAllowed=e[3]),256&n[0]&&(l.value=e[8]),t.$set(l);},i(e){n||(transition_in(t.$$.fragment,e),n=!0);},o(e){transition_out(t.$$.fragment,e),n=!1;},d(e){destroy_component(t,e);}}}function Kt(e){let t,n,l,o,i,d,f,w,k,L,M,Y,A=e[0]&&Zt(e);const T=[{placeholder:e[7]?e[5].message||"date":""},e[5],{message:e[5].message},{error:e[9]},{style:`padding-right: ${e[0]?0:21}px;`}];function N(t){e[21](t);}let I={};for(let e=0;e<T.length;e+=1)I=assign(I,T[e]);void 0!==e[4]&&(I.value=e[4]),l=new Ve({props:I}),binding_callbacks.push(()=>bind(l,"value",N)),l.$on("keydown",e[16]),l.$on("focus",e[14]),l.$on("blur",e[15]);let B=!e[0]&&Ut(e);function S(t){e[22](t);}let q={dx:e[0]?36:0,dy:"24",style:"border-radius: 4px;",$$slots:{default:[Gt]},$$scope:{ctx:e}};return void 0!==e[7]&&(q.visible=e[7]),f=new Je({props:q}),binding_callbacks.push(()=>bind(f,"visible",S)),f.$on("close",e[17]),{c(){t=element("div"),A&&A.c(),n=space(),create_component(l.$$.fragment),i=space(),B&&B.c(),d=space(),create_component(f.$$.fragment),attr(t,"class","date-field svelte-wtu8yz"),attr(t,"disabled",k=e[2]||null),toggle_class(t,"focus-visible",e[7]||e[10]);},m(o,s){insert(o,t,s),A&&A.m(t,null),append(t,n),mount_component(l,t,null),append(t,i),B&&B.m(t,null),append(t,d),mount_component(f,t,null),e[23](t),L=!0,M||(Y=action_destroyer(e[11].call(null,t)),M=!0);},p(e,i){e[0]?A?(A.p(e,i),1&i[0]&&transition_in(A,1)):(A=Zt(e),A.c(),transition_in(A,1),A.m(t,n)):A&&(group_outros(),transition_out(A,1,1,()=>{A=null;}),check_outros());const s=673&i[0]?get_spread_update(T,[160&i[0]&&{placeholder:e[7]?e[5].message||"date":""},32&i[0]&&get_spread_object(e[5]),32&i[0]&&{message:e[5].message},512&i[0]&&{error:e[9]},1&i[0]&&{style:`padding-right: ${e[0]?0:21}px;`}]):{};!o&&16&i[0]&&(o=!0,s.value=e[4],add_flush_callback(()=>o=!1)),l.$set(s),e[0]?B&&(group_outros(),transition_out(B,1,1,()=>{B=null;}),check_outros()):B?(B.p(e,i),1&i[0]&&transition_in(B,1)):(B=Ut(e),B.c(),transition_in(B,1),B.m(t,d));const r={};1&i[0]&&(r.dx=e[0]?36:0),266&i[0]|2&i[1]&&(r.$$scope={dirty:i,ctx:e}),!w&&128&i[0]&&(w=!0,r.visible=e[7],add_flush_callback(()=>w=!1)),f.$set(r),(!L||4&i[0]&&k!==(k=e[2]||null))&&attr(t,"disabled",k),1152&i[0]&&toggle_class(t,"focus-visible",e[7]||e[10]);},i(e){L||(transition_in(A),transition_in(l.$$.fragment,e),transition_in(B),transition_in(f.$$.fragment,e),L=!0);},o(e){transition_out(A),transition_out(l.$$.fragment,e),transition_out(B),transition_out(f.$$.fragment,e),L=!1;},d(n){n&&detach(t),A&&A.d(),destroy_component(l),B&&B.d(),destroy_component(f),e[23](null),M=!1,Y();}}}const Jt="YYYY-MM-DD";function Qt(e,t,n){let{icon:l=!1}=t,{value:o=""}=t,{locale:i}=t,{readonly:s}=t,{disabled:r=null}=t,{format:a=Jt}=t,{isAllowed:c=(()=>!0)}=t;const d=oe(current_component),u=createEventDispatcher();let f,v,h={},m=!1,g=_e(o)?Se(o,a):o,b="",x=C(o),w=!1;function $(){if(n(9,b=""),g.length>=a.length){let e=Fe(g,a);if(_e(e)&&!isNaN(e))return}g.length>0&&n(9,b=a);}function z(){m||(n(8,v=Fe(g,a)),n(7,m=!0));}function k(){if(s)return;let e=f.querySelectorAll("input");e[0]&&e[0].focus();}function D(e){n(18,o="string"==typeof o?_e(e)?Se(e,a):e:_e(e)?C(e):Fe(e,a)),function(e,t){if(_e(e)&&_e(t))return n=t,Se(e,"YYYYMMDD")===Se(n,"YYYYMMDD");var n;return e===t}(o,x)||(x=C(o),u("date-change",o));}function C(e){return _e(e)?isNaN(e)?new Date(NaN):new Date(e.getTime()):e}return e.$$set=e=>{n(31,t=assign(assign({},t),exclude_internal_props(e))),"icon"in e&&n(0,l=e.icon),"value"in e&&n(18,o=e.value),"locale"in e&&n(1,i=e.locale),"readonly"in e&&n(20,s=e.readonly),"disabled"in e&&n(2,r=e.disabled),"format"in e&&n(19,a=e.format),"isAllowed"in e&&n(3,c=e.isAllowed);},e.$$.update=()=>{{const{icon:e,value:l,type:o,locale:i,format:s,isAllowed:r,...a}=t;n(5,h=a);}524288&e.$$.dirty[0]&&n(19,a=a||Jt),16&e.$$.dirty[0]&&$(),524288&e.$$.dirty[0]&&(!_e(o)||isNaN(o)?$():n(4,g=Se(o,a)));},t=exclude_internal_props(t),[l,i,r,c,g,h,f,m,v,b,w,d,z,function({detail:e}){n(4,g=Se(e,a)),n(18,o="string"==typeof o?g:C(e)),n(7,m=!1),s?D(g):k();},function(){n(10,w=!0),s&&z();},function(e){n(10,w=!1),setTimeout(()=>{e.target.parentNode.parentNode.contains(document.activeElement)||D(g);},0);},function(e){32===e.keyCode&&(e.stopPropagation(),e.preventDefault(),z());},k,o,a,s,function(e){g=e,n(4,g);},function(e){m=e,n(7,m);},function(e){binding_callbacks[e?"unshift":"push"](()=>{f=e,n(6,f);});}]}class en extends SvelteComponent{constructor(e){var t;super(),Rt.getElementById("svelte-wtu8yz-style")||((t=element("style")).id="svelte-wtu8yz-style",t.textContent=".date-field.svelte-wtu8yz{position:relative;display:flex;align-items:center}",append(Rt.head,t)),init(this,e,Qt,Kt,safe_not_equal,{icon:0,value:18,locale:1,readonly:20,disabled:2,format:19,isAllowed:3},[-1,-1]);}}function tn(e){let t="hidden"===document.body.style.overflow;if(e&&t){let e=Math.abs(parseInt(document.body.style.top));document.body.style.cssText=null,document.body.removeAttribute("style"),window.scrollTo(0,e);}else e||t||(document.body.style.top="-"+Math.max(document.body.scrollTop,document.documentElement&&document.documentElement.scrollTop||0)+"px",document.body.style.position="fixed",document.body.style.width="100%",document.body.style.overflow="hidden");}const nn=e=>({}),ln=e=>({}),on=e=>({}),sn=e=>({}),rn=e=>({}),an=e=>({});function cn(t){let n,l,o,i,d,p,v,h,b,C,L,M,Y,T;const N=t[16].title,I=create_slot(N,t,t[15],an),B=t[16].default,q=create_slot(B,t,t[15],null),F=t[16].actions,_=create_slot(F,t,t[15],sn),H=t[16].footer,O=create_slot(H,t,t[15],ln);let X=[{class:h="dialog "+t[1]},{style:b=`width: ${t[3]}px;${t[2]}`},{tabindex:"-1"},t[6]],P={};for(let e=0;e<X.length;e+=1)P=assign(P,X[e]);return {c(){n=element("div"),l=element("div"),o=element("div"),I&&I.c(),i=space(),d=element("div"),q&&q.c(),p=space(),_&&_.c(),v=space(),O&&O.c(),attr(o,"class","title svelte-1pkw9hl"),attr(d,"class","content svelte-1pkw9hl"),set_attributes(l,P),toggle_class(l,"svelte-1pkw9hl",!0),attr(n,"class","overlay svelte-1pkw9hl");},m(s,a){insert(s,n,a),append(n,l),append(l,o),I&&I.m(o,null),append(l,i),append(l,d),q&&q.m(d,null),append(l,p),_&&_.m(l,null),append(l,v),O&&O.m(l,null),t[18](l),M=!0,Y||(T=[action_destroyer(t[8].call(null,l)),listen(l,"mousedown",stop_propagation(t[17])),listen(l,"mouseenter",t[19]),listen(n,"mousedown",t[20]),listen(n,"mouseup",t[21])],Y=!0);},p(e,n){t=e,I&&I.p&&32768&n&&update_slot(I,N,t,t[15],n,rn,an),q&&q.p&&32768&n&&update_slot(q,B,t,t[15],n,null,null),_&&_.p&&32768&n&&update_slot(_,F,t,t[15],n,on,sn),O&&O.p&&32768&n&&update_slot(O,H,t,t[15],n,nn,ln),set_attributes(l,P=get_spread_update(X,[(!M||2&n&&h!==(h="dialog "+t[1]))&&{class:h},(!M||12&n&&b!==(b=`width: ${t[3]}px;${t[2]}`))&&{style:b},{tabindex:"-1"},64&n&&t[6]])),toggle_class(l,"svelte-1pkw9hl",!0);},i(e){M||(transition_in(I,e),transition_in(q,e),transition_in(_,e),transition_in(O,e),C||add_render_callback(()=>{C=create_in_transition(l,scale,{duration:180,opacity:.5,start:.75,easing:quintOut}),C.start();}),add_render_callback(()=>{L||(L=create_bidirectional_transition(n,fade,{duration:180},!0)),L.run(1);}),M=!0);},o(e){transition_out(I,e),transition_out(q,e),transition_out(_,e),transition_out(O,e),L||(L=create_bidirectional_transition(n,fade,{duration:180},!1)),L.run(0),M=!1;},d(e){e&&detach(n),I&&I.d(e),q&&q.d(e),_&&_.d(e),O&&O.d(e),t[18](null),e&&L&&L.end(),Y=!1,run_all(T);}}}function dn(t){let n,l,o,i,s=t[0]&&cn(t);return {c(){s&&s.c(),n=empty();},m(r,a){s&&s.m(r,a),insert(r,n,a),l=!0,o||(i=[listen(window,"keydown",t[10]),listen(window,"popstate",t[11])],o=!0);},p(e,[t]){e[0]?s?(s.p(e,t),1&t&&transition_in(s,1)):(s=cn(e),s.c(),transition_in(s,1),s.m(n.parentNode,n)):s&&(group_outros(),transition_out(s,1,1,()=>{s=null;}),check_outros());},i(e){l||(transition_in(s),l=!0);},o(e){transition_out(s),l=!1;},d(e){s&&s.d(e),e&&detach(n),o=!1,run_all(i);}}}function un(e,n,l){let{$$slots:o={},$$scope:i}=n;const s=createEventDispatcher(),r=oe(current_component);let a,{class:c=""}=n,{style:d=""}=n,{visible:u=!1}=n,{width:f=320}=n,{modal:v=!1}=n,{closeByEsc:h=!0}=n,{beforeClose:m=(()=>!0)}=n,g=!1,b={},x=!1;function w(e){m()&&(s("close",e),l(0,u=!1));}onMount(async()=>{await tick(),l(14,x=!0);}),onDestroy(()=>{x&&tn(!0);});return e.$$set=e=>{l(24,n=assign(assign({},n),exclude_internal_props(e))),"class"in e&&l(1,c=e.class),"style"in e&&l(2,d=e.style),"visible"in e&&l(0,u=e.visible),"width"in e&&l(3,f=e.width),"modal"in e&&l(4,v=e.modal),"closeByEsc"in e&&l(12,h=e.closeByEsc),"beforeClose"in e&&l(13,m=e.beforeClose),"$$scope"in e&&l(15,i=e.$$scope);},e.$$.update=()=>{{const{style:e,visible:t,width:o,modal:i,closeByEsc:s,beforeClose:r,...a}=n;l(6,b=a);}16385&e.$$.dirty&&(u?(x&&tn(!1),async function(){if(!a)return;await tick();let e=a.querySelectorAll('input:not([type="hidden"])'),t=e.length,n=0;for(;n<t&&!e[n].getAttribute("autofocus");n++);n<t?e[n].focus():t>0?e[0].focus():a.focus(),s("open");}()):(l(5,g=!1),x&&tn(!0)));},n=exclude_internal_props(n),[u,c,d,f,v,g,b,a,r,w,function(e){const t="Escape";27!==e.keyCode&&e.key!==t&&e.code!==t||h&&w(t),u&&Re(e,a);},function(){l(0,u=!1);},h,m,x,i,o,function(n){bubble(e,n);},function(e){binding_callbacks[e?"unshift":"push"](()=>{a=e,l(7,a);});},()=>{l(5,g=!1);},()=>{l(5,g=!0);},()=>{g&&!v&&w("clickOutside");}]}class pn extends SvelteComponent{constructor(e){var t;super(),document.getElementById("svelte-1pkw9hl-style")||((t=element("style")).id="svelte-1pkw9hl-style",t.textContent=".overlay.svelte-1pkw9hl{background-color:rgba(0, 0, 0, 0.5);cursor:pointer;position:fixed;left:0;top:0;right:0;bottom:0;z-index:30;display:flex;justify-content:center;align-items:center}.dialog.svelte-1pkw9hl{position:relative;font-size:1rem;background:#eee;background:var(--bg-panel, #eee);border-radius:4px;cursor:auto;box-shadow:0 11px 15px -7px rgba(0, 0, 0, 0.2), 0 24px 38px 3px rgba(0, 0, 0, 0.14),\r\n\t\t\t0 9px 46px 8px rgba(0, 0, 0, 0.12);z-index:40;max-height:80%;overflow-x:hidden;overflow-y:auto}.dialog.svelte-1pkw9hl:focus{outline:none}.dialog.svelte-1pkw9hl::-moz-focus-inner{border:0}.dialog.svelte-1pkw9hl:-moz-focusring{outline:none}div.svelte-1pkw9hl .actions{min-height:48px;padding:8px;display:flex;align-items:center}div.svelte-1pkw9hl .center{justify-content:center}div.svelte-1pkw9hl .left{justify-content:flex-start}div.svelte-1pkw9hl .right{justify-content:flex-end}.title.svelte-1pkw9hl{padding:16px 16px 12px;font-size:24px;line-height:36px;background:rgba(0, 0, 0, 0.1);background:var(--divider, rgba(0, 0, 0, 0.1))}.content.svelte-1pkw9hl{margin:16px}",append(document.head,t)),init(this,e,un,dn,safe_not_equal,{class:1,style:2,visible:0,width:3,modal:4,closeByEsc:12,beforeClose:13});}}const fn=e=>({}),vn=e=>({});function hn(e){let t,n,l;const o=e[12].default,i=create_slot(o,e,e[11],null);return {c(){t=element("div"),i&&i.c(),attr(t,"class","content svelte-duf4ie");},m(e,n){insert(e,t,n),i&&i.m(t,null),l=!0;},p(e,t){i&&i.p&&2048&t&&update_slot(i,o,e,e[11],t,null,null);},i(e){l||(transition_in(i,e),e&&add_render_callback(()=>{n||(n=create_bidirectional_transition(t,slide,{duration:250},!0)),n.run(1);}),l=!0);},o(e){transition_out(i,e),e&&(n||(n=create_bidirectional_transition(t,slide,{duration:250},!1)),n.run(0)),l=!1;},d(e){e&&detach(t),i&&i.d(e),e&&n&&n.end();}}}function mn(t){let n,l,o,i,d,p,v,b,L,M;const Y=t[12].icon,A=create_slot(Y,t,t[11],vn),T=A||function(e){let t;return {c(){t=element("i"),t.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"></path></svg>',attr(t,"class","icon svelte-duf4ie");},m(e,n){insert(e,t,n);},d(e){e&&detach(t);}}}();let B=t[5]&&hn(t),S=[{class:v="panel "+t[0]},t[6]],q={};for(let e=0;e<S.length;e+=1)q=assign(q,S[e]);return {c(){n=element("div"),l=element("button"),o=element("span"),i=text(t[1]),d=space(),T&&T.c(),p=space(),B&&B.c(),attr(o,"class","svelte-duf4ie"),attr(l,"class","header svelte-duf4ie"),l.disabled=t[4],toggle_class(l,"rotate",t[3]),set_attributes(n,q),toggle_class(n,"dense",t[2]),toggle_class(n,"active",t[5]),toggle_class(n,"svelte-duf4ie",!0);},m(s,a){insert(s,n,a),append(n,l),append(l,o),append(o,i),append(l,d),T&&T.m(l,null),append(n,p),B&&B.m(n,null),b=!0,L||(M=[listen(l,"click",t[8]),action_destroyer(t[7].call(null,n))],L=!0);},p(e,[t]){(!b||2&t)&&set_data(i,e[1]),A&&A.p&&2048&t&&update_slot(A,Y,e,e[11],t,fn,vn),(!b||16&t)&&(l.disabled=e[4]),8&t&&toggle_class(l,"rotate",e[3]),e[5]?B?(B.p(e,t),32&t&&transition_in(B,1)):(B=hn(e),B.c(),transition_in(B,1),B.m(n,null)):B&&(group_outros(),transition_out(B,1,1,()=>{B=null;}),check_outros()),set_attributes(n,q=get_spread_update(S,[(!b||1&t&&v!==(v="panel "+e[0]))&&{class:v},64&t&&e[6]])),toggle_class(n,"dense",e[2]),toggle_class(n,"active",e[5]),toggle_class(n,"svelte-duf4ie",!0);},i(e){b||(transition_in(T,e),transition_in(B),b=!0);},o(e){transition_out(T,e),transition_out(B),b=!1;},d(e){e&&detach(n),T&&T.d(e),B&&B.d(),L=!1,run_all(M);}}}function gn(e,t,n){let l,{$$slots:o={},$$scope:i}=t;const s=oe(current_component),r=createEventDispatcher();let{class:a=""}=t,{name:c="?"}=t,{group:d=""}=t,{dense:u=!1}=t,{rotate:p=!0}=t,{expand:f=!1}=t,{disabled:v=!1}=t,h={};return e.$$set=e=>{n(14,t=assign(assign({},t),exclude_internal_props(e))),"class"in e&&n(0,a=e.class),"name"in e&&n(1,c=e.name),"group"in e&&n(9,d=e.group),"dense"in e&&n(2,u=e.dense),"rotate"in e&&n(3,p=e.rotate),"expand"in e&&n(10,f=e.expand),"disabled"in e&&n(4,v=e.disabled),"$$scope"in e&&n(11,i=e.$$scope);},e.$$.update=()=>{{const{name:e,group:l,dense:o,rotate:i,expand:s,disabled:r,...a}=t;delete a.class,n(6,h=a);}1026&e.$$.dirty&&f&&n(9,d=c),514&e.$$.dirty&&n(5,l=d===c),34&e.$$.dirty&&r("change",{expanded:l,name:c});},t=exclude_internal_props(t),[a,c,u,p,v,l,h,s,function(e){n(9,d=d===c?"":c),e.target.classList.remove("focus-visible");},d,f,i,o]}class bn extends SvelteComponent{constructor(e){var t;super(),document.getElementById("svelte-duf4ie-style")||((t=element("style")).id="svelte-duf4ie-style",t.textContent=".panel.svelte-duf4ie.svelte-duf4ie{position:relative;box-sizing:border-box;background:var(--bg-color, #fbfbfb);box-shadow:0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14),\r\n\t\t\t0px 1px 3px 0px var(--border, #dfdfdf);transition:margin 0.25s}.panel.svelte-duf4ie.svelte-duf4ie::before{position:absolute;top:-1px;left:0;right:0;height:1px;content:'';background-color:var(--divider, rgba(0, 0, 0, 0.1))}.panel.svelte-duf4ie.svelte-duf4ie:first-child{border-top:none;border-top-left-radius:inherit;border-top-right-radius:inherit}.panel.svelte-duf4ie.svelte-duf4ie:last-child{border-bottom-left-radius:inherit;border-bottom-right-radius:inherit}.panel.svelte-duf4ie.svelte-duf4ie:first-child::before{display:none}.panel.active.svelte-duf4ie.svelte-duf4ie:not(:first-child):not(.dense){margin-top:16px}.panel.active.svelte-duf4ie.svelte-duf4ie:not(.dense)::before{display:none}.header.svelte-duf4ie.svelte-duf4ie{display:flex;align-items:flex-start;width:100%;min-height:48px;cursor:pointer;background:none;color:inherit;font-size:16px;line-height:1;border:2px solid transparent;outline:none;margin:0;padding:10px 22px;text-align:left;outline:none;transition:min-height 0.25s}.header.svelte-duf4ie.svelte-duf4ie:active{background:none}.header.svelte-duf4ie span.svelte-duf4ie{flex:1;line-height:24px}.icon.svelte-duf4ie.svelte-duf4ie{display:inline-block;line-height:0.5}.panel.svelte-duf4ie .icon{transition:0.25s linear}.active.svelte-duf4ie .header.svelte-duf4ie{min-height:64px}.active.svelte-duf4ie .rotate.svelte-duf4ie .icon{transform:rotate(-180deg)}.content.svelte-duf4ie.svelte-duf4ie{overflow:auto;margin:0;padding:0 24px 16px}@media(hover: hover){.header.focus-visible.svelte-duf4ie.svelte-duf4ie:focus:not([disabled]):not(.disabled){outline:none;border:2px solid var(--focus-color, rgba(25, 118, 210, 0.5))}}",append(document.head,t)),init(this,e,gn,mn,safe_not_equal,{class:0,name:1,group:9,dense:2,rotate:3,expand:10,disabled:4});}}const yn=e=>({}),xn=e=>({});function wn(e){let t,n,l;const o=e[11].default,i=create_slot(o,e,e[14],null);return {c(){t=element("ul"),i&&i.c(),attr(t,"style",n=`min-width: ${e[5]}px`),attr(t,"class","svelte-1vc5q8h");},m(e,n){insert(e,t,n),i&&i.m(t,null),l=!0;},p(e,s){i&&i.p&&16384&s&&update_slot(i,o,e,e[14],s,null,null),(!l||32&s&&n!==(n=`min-width: ${e[5]}px`))&&attr(t,"style",n);},i(e){l||(transition_in(i,e),l=!0);},o(e){transition_out(i,e),l=!1;},d(e){e&&detach(t),i&&i.d(e);}}}function $n(t){let n,l,o,i,y,w,$;const D=t[11].activator,C=create_slot(D,t,t[14],xn),j=C||function(e){let t;return {c(){t=element("span");},m(e,n){insert(e,t,n);},d(e){e&&detach(t);}}}();function L(e){t[12](e);}let M={class:t[0],style:t[1],origin:t[4],dx:t[2],dy:t[3],$$slots:{default:[wn]},$$scope:{ctx:t}};return void 0!==t[6]&&(M.visible=t[6]),o=new Je({props:M}),binding_callbacks.push(()=>bind(o,"visible",L)),o.$on("click",t[10]),{c(){n=element("div"),j&&j.c(),l=space(),create_component(o.$$.fragment),attr(n,"class","menu svelte-1vc5q8h");},m(i,s){insert(i,n,s),j&&j.m(n,null),append(n,l),mount_component(o,n,null),t[13](n),y=!0,w||($=[listen(n,"click",t[9]),action_destroyer(t[8].call(null,n))],w=!0);},p(e,[t]){C&&C.p&&16384&t&&update_slot(C,D,e,e[14],t,yn,xn);const n={};1&t&&(n.class=e[0]),2&t&&(n.style=e[1]),16&t&&(n.origin=e[4]),4&t&&(n.dx=e[2]),8&t&&(n.dy=e[3]),16416&t&&(n.$$scope={dirty:t,ctx:e}),!i&&64&t&&(i=!0,n.visible=e[6],add_flush_callback(()=>i=!1)),o.$set(n);},i(e){y||(transition_in(j,e),transition_in(o.$$.fragment,e),y=!0);},o(e){transition_out(j,e),transition_out(o.$$.fragment,e),y=!1;},d(e){e&&detach(n),j&&j.d(e),destroy_component(o),t[13](null),w=!1,run_all($);}}}function zn(e,t,n){let{$$slots:l={},$$scope:o}=t;const i=oe(current_component);let s,{class:r=""}=t,{style:a=null}=t,{dx:c=0}=t,{dy:d=0}=t,{origin:u="top left"}=t,{width:f=112}=t,v=!1;return e.$$set=e=>{"class"in e&&n(0,r=e.class),"style"in e&&n(1,a=e.style),"dx"in e&&n(2,c=e.dx),"dy"in e&&n(3,d=e.dy),"origin"in e&&n(4,u=e.origin),"width"in e&&n(5,f=e.width),"$$scope"in e&&n(14,o=e.$$scope);},[r,a,c,d,u,f,v,s,i,function(e){try{s.childNodes[0].contains(e.target)?n(6,v=!v):e.target===s&&n(6,v=!1);}catch(e){console.error(e);}},function(e){e.target.classList.contains("menu-item")&&n(6,v=!1);},l,function(e){v=e,n(6,v);},function(e){binding_callbacks[e?"unshift":"push"](()=>{s=e,n(7,s);});},o]}class kn extends SvelteComponent{constructor(e){var t;super(),document.getElementById("svelte-1vc5q8h-style")||((t=element("style")).id="svelte-1vc5q8h-style",t.textContent="@supports (-webkit-overflow-scrolling: touch){html{cursor:pointer}}.menu.svelte-1vc5q8h{position:relative;display:inline-block;vertical-align:middle}ul.svelte-1vc5q8h{margin:0;padding:8px 0;width:100%;position:relative;overflow-x:hidden;overflow-y:visible}",append(document.head,t)),init(this,e,zn,$n,safe_not_equal,{class:0,style:1,dx:2,dy:3,origin:4,width:5});}}function Dn(t){let n,l,o,i,d,p,v;const h=t[9].default,b=create_slot(h,t,t[8],null);let L=t[1]&&jn(),M=[{class:o="menu-item "+t[0]},{tabindex:i=t[2]?"-1":"0"},t[4]],Y={};for(let e=0;e<M.length;e+=1)Y=assign(Y,M[e]);return {c(){n=element("li"),b&&b.c(),l=space(),L&&L.c(),set_attributes(n,Y),toggle_class(n,"svelte-mmrniu",!0);},m(o,i){insert(o,n,i),b&&b.m(n,null),append(n,l),L&&L.m(n,null),t[11](n),d=!0,p||(v=[listen(n,"keydown",t[7]),action_destroyer(t[6].call(null,n))],p=!0);},p(e,t){b&&b.p&&256&t&&update_slot(b,h,e,e[8],t,null,null),e[1]?L?2&t&&transition_in(L,1):(L=jn(),L.c(),transition_in(L,1),L.m(n,null)):L&&(group_outros(),transition_out(L,1,1,()=>{L=null;}),check_outros()),set_attributes(n,Y=get_spread_update(M,[(!d||1&t&&o!==(o="menu-item "+e[0]))&&{class:o},(!d||4&t&&i!==(i=e[2]?"-1":"0"))&&{tabindex:i},16&t&&e[4]])),toggle_class(n,"svelte-mmrniu",!0);},i(e){d||(transition_in(b,e),transition_in(L),d=!0);},o(e){transition_out(b,e),transition_out(L),d=!1;},d(e){e&&detach(n),b&&b.d(e),L&&L.d(),t[11](null),p=!1,run_all(v);}}}function Cn(t){let n,l,o,i,d,v,h,b;const L=t[9].default,M=create_slot(L,t,t[8],null);let Y=t[1]&&En(),A=[{class:i="menu-item "+t[0]},{href:t[3]},{tabindex:d=t[2]?"-1":"0"},t[4]],T={};for(let e=0;e<A.length;e+=1)T=assign(T,A[e]);return {c(){n=element("li"),l=element("a"),M&&M.c(),o=space(),Y&&Y.c(),set_attributes(l,T),toggle_class(l,"svelte-mmrniu",!0),attr(n,"class","svelte-mmrniu");},m(i,s){insert(i,n,s),append(n,l),M&&M.m(l,null),append(l,o),Y&&Y.m(l,null),t[10](l),v=!0,h||(b=[listen(l,"keydown",t[7]),action_destroyer(t[6].call(null,l))],h=!0);},p(e,t){M&&M.p&&256&t&&update_slot(M,L,e,e[8],t,null,null),e[1]?Y?2&t&&transition_in(Y,1):(Y=En(),Y.c(),transition_in(Y,1),Y.m(l,null)):Y&&(group_outros(),transition_out(Y,1,1,()=>{Y=null;}),check_outros()),set_attributes(l,T=get_spread_update(A,[(!v||1&t&&i!==(i="menu-item "+e[0]))&&{class:i},(!v||8&t)&&{href:e[3]},(!v||4&t&&d!==(d=e[2]?"-1":"0"))&&{tabindex:d},16&t&&e[4]])),toggle_class(l,"svelte-mmrniu",!0);},i(e){v||(transition_in(M,e),transition_in(Y),v=!0);},o(e){transition_out(M,e),transition_out(Y),v=!1;},d(e){e&&detach(n),M&&M.d(e),Y&&Y.d(),t[10](null),h=!1,run_all(b);}}}function jn(e){let t,n;return t=new he({}),{c(){create_component(t.$$.fragment);},m(e,l){mount_component(t,e,l),n=!0;},i(e){n||(transition_in(t.$$.fragment,e),n=!0);},o(e){transition_out(t.$$.fragment,e),n=!1;},d(e){destroy_component(t,e);}}}function En(e){let t,n;return t=new he({}),{c(){create_component(t.$$.fragment);},m(e,l){mount_component(t,e,l),n=!0;},i(e){n||(transition_in(t.$$.fragment,e),n=!0);},o(e){transition_out(t.$$.fragment,e),n=!1;},d(e){destroy_component(t,e);}}}function Ln(e){let t,n,l,o;const i=[Cn,Dn],s=[];function r(e,t){return e[3]?0:1}return t=r(e),n=s[t]=i[t](e),{c(){n.c(),l=empty();},m(e,n){s[t].m(e,n),insert(e,l,n),o=!0;},p(e,[o]){let a=t;t=r(e),t===a?s[t].p(e,o):(group_outros(),transition_out(s[a],1,1,()=>{s[a]=null;}),check_outros(),n=s[t],n?n.p(e,o):(n=s[t]=i[t](e),n.c()),transition_in(n,1),n.m(l.parentNode,l));},i(e){o||(transition_in(n),o=!0);},o(e){transition_out(n),o=!1;},d(e){s[t].d(e),e&&detach(l);}}}function Mn(e,t,n){let{$$slots:l={},$$scope:o}=t;const i=oe(current_component);let s,{class:r=""}=t,{ripple:a=!0}=t,c=!1,d=null,u={};return e.$$set=e=>{n(12,t=assign(assign({},t),exclude_internal_props(e))),"class"in e&&n(0,r=e.class),"ripple"in e&&n(1,a=e.ripple),"$$scope"in e&&n(8,o=e.$$scope);},e.$$.update=()=>{{const{href:e,ripple:l,...o}=t;delete o.class,!1===o.disabled&&delete o.disabled,n(2,c=!!o.disabled),n(3,d=e&&!c?e:null),n(4,u=o);}},t=exclude_internal_props(t),[r,a,c,d,u,s,i,function(e){if(13===e.keyCode||32===e.keyCode){e.stopPropagation(),e.preventDefault();const t=new MouseEvent("click",{bubbles:!0,cancelable:!0});s.dispatchEvent(t),s.blur();}},o,l,function(e){binding_callbacks[e?"unshift":"push"](()=>{s=e,n(5,s);});},function(e){binding_callbacks[e?"unshift":"push"](()=>{s=e,n(5,s);});}]}class Yn extends SvelteComponent{constructor(e){var t;super(),document.getElementById("svelte-mmrniu-style")||((t=element("style")).id="svelte-mmrniu-style",t.textContent="li.svelte-mmrniu{display:block}a.svelte-mmrniu,a.svelte-mmrniu:hover{text-decoration:none}.menu-item.svelte-mmrniu{position:relative;color:inherit;cursor:pointer;height:44px;user-select:none;display:flex;align-items:center;padding:0 16px;white-space:nowrap}.menu-item.svelte-mmrniu:focus{outline:none}.menu-item.svelte-mmrniu::-moz-focus-inner{border:0}.menu-item.svelte-mmrniu:-moz-focusring{outline:none}.menu-item.svelte-mmrniu:before{background-color:currentColor;color:inherit;bottom:0;content:'';left:0;opacity:0;pointer-events:none;position:absolute;right:0;top:0;transition:0.3s cubic-bezier(0.25, 0.8, 0.5, 1)}@media(hover: hover){.menu-item.svelte-mmrniu:hover:not([disabled]):not(.disabled):before{opacity:0.15}.focus-visible.menu-item:focus:not([disabled]):not(.disabled):before{opacity:0.3}}",append(document.head,t)),init(this,e,Mn,Ln,safe_not_equal,{class:0,ripple:1});}}const{document:Kn}=globals;function Jn(e,t,n){const l=e.slice();return l[17]=t[n],l[19]=n,l}function Qn(t,n){let l,o,i,d,p,f,y,w,$=n[17]+"";function z(...e){return n[12](n[19],...e)}return d=new he({props:{center:!0}}),{key:t,first:null,c(){l=element("button"),o=text($),i=space(),create_component(d.$$.fragment),attr(l,"class",p="tabbutton "+(n[0]==n[19]?"tabbuttonactive":"")+" svelte-4jfme"),this.first=l;},m(t,n){insert(t,l,n),append(l,o),append(l,i),mount_component(d,l,null),f=!0,y||(w=listen(l,"click",z),y=!0);},p(e,t){n=e,(!f||8&t)&&$!==($=n[17]+"")&&set_data(o,$),(!f||9&t&&p!==(p="tabbutton "+(n[0]==n[19]?"tabbuttonactive":"")+" svelte-4jfme"))&&attr(l,"class",p);},i(e){f||(transition_in(d.$$.fragment,e),f=!0);},o(e){transition_out(d.$$.fragment,e),f=!1;},d(e){e&&detach(l),destroy_component(d),y=!1,w();}}}function el(e){let t,n,l,o,i,d,p,v,h,E,L,M,Y=[],A=new Map,T=e[3];const N=e=>e[17];for(let t=0;t<T.length;t+=1){let n=Jn(e,T,t),l=N(n);A.set(l,Y[t]=Qn(l,n));}const I=e[11].default,B=create_slot(I,e,e[10],null);let S=[{class:h="tabbar "+e[1]},{style:e[2]},e[5]],q={};for(let e=0;e<S.length;e+=1)q=assign(q,S[e]);return {c(){t=element("div"),n=element("div");for(let e=0;e<Y.length;e+=1)Y[e].c();l=space(),o=element("span"),d=space(),p=element("div"),v=element("div"),B&&B.c(),attr(o,"class","tabindicator svelte-4jfme"),attr(o,"style",i=e[7]+"; background-color:var(--primary);"),attr(n,"class","tabbar-wrap svelte-4jfme"),attr(v,"class","tabcontent svelte-4jfme"),attr(v,"style",e[6]),attr(p,"class","tabcontent-wrap svelte-4jfme"),set_attributes(t,q),toggle_class(t,"svelte-4jfme",!0);},m(i,s){insert(i,t,s),append(t,n);for(let e=0;e<Y.length;e+=1)Y[e].m(n,null);append(n,l),append(n,o),append(t,d),append(t,p),append(p,v),B&&B.m(v,null),e[13](t),E=!0,L||(M=action_destroyer(e[8].call(null,t)),L=!0);},p(e,[s]){521&s&&(T=e[3],group_outros(),Y=update_keyed_each(Y,s,N,1,e,T,A,n,outro_and_destroy_block,Qn,l,Jn),check_outros()),(!E||128&s&&i!==(i=e[7]+"; background-color:var(--primary);"))&&attr(o,"style",i),B&&B.p&&1024&s&&update_slot(B,I,e,e[10],s,null,null),(!E||64&s)&&attr(v,"style",e[6]),set_attributes(t,q=get_spread_update(S,[(!E||2&s&&h!==(h="tabbar "+e[1]))&&{class:h},(!E||4&s)&&{style:e[2]},32&s&&e[5]])),toggle_class(t,"svelte-4jfme",!0);},i(e){if(!E){for(let e=0;e<T.length;e+=1)transition_in(Y[e]);transition_in(B,e),E=!0;}},o(e){for(let e=0;e<Y.length;e+=1)transition_out(Y[e]);transition_out(B,e),E=!1;},d(n){n&&detach(t);for(let e=0;e<Y.length;e+=1)Y[e].d();B&&B.d(n),e[13](null),L=!1,M();}}}function tl(e,t,n){let{$$slots:l={},$$scope:o}=t;const i=createEventDispatcher(),s=oe(current_component);let r,{class:a=""}=t,{style:c=null}=t,d={},u="transform:translate3d(0%, 0px, 0px);",f="",{tabNames:v=[]}=t,{activeTab:h=0}=t;async function m(){await tick;let e=r.querySelectorAll(".tabbutton");if(e&&e.length>0){let t={};return h>=e.length&&(h>e.length?n(0,h=e.length-1):n(0,h--,h)),t.target=e[h],g(t,h),!0}return !1}function g(e,t){let l=e.target;n(6,u="transform:translate3d(-"+100*t+"%, 0px, 0px);"),n(7,f="left:"+l.offsetLeft+"px; width:"+l.offsetWidth+"px;"),n(0,h=t),i("change",{activeTab:h});}onMount(()=>{m()&&function(e,t){let n=0,l=0;function o(t){e.style.userSelect="none",l=t.touches?t.touches[0].clientX:t.clientX,document.addEventListener("mouseup",s),document.addEventListener("mousemove",i),document.addEventListener("touchmove",i,!1),document.addEventListener("touchend",s,!1);}function i(o){e.style.pointerEvents="none";const i=o.touches?o.touches[0].clientX:o.clientX;n=l-i,l=i;const s=parseInt(e.style.left)-n;e.style.left=(s>0?0:s+e.scrollWidth<=t.clientWidth?t.clientWidth-e.scrollWidth:s)+"px";}function s(){document.removeEventListener("mouseup",s),document.removeEventListener("mousemove",i),document.removeEventListener("touchmove",i),document.removeEventListener("touchend",i),e.style.pointerEvents="all",e.style.userSelect="all";}e.addEventListener("mousedown",o),e.addEventListener("touchstart",o,!1),""==e.style.left&&(e.style.left="0px");}(r.querySelector(".tabbar-wrap"),r);});return e.$$set=e=>{n(16,t=assign(assign({},t),exclude_internal_props(e))),"class"in e&&n(1,a=e.class),"style"in e&&n(2,c=e.style),"tabNames"in e&&n(3,v=e.tabNames),"activeTab"in e&&n(0,h=e.activeTab),"$$scope"in e&&n(10,o=e.$$scope);},e.$$.update=()=>{{const{style:e,tabNames:l,activeTab:o,...i}=t;n(5,d=i);}9&e.$$.dirty&&(n(0,h=Math.abs(parseInt(h))),Number.isInteger(h)||n(0,h=0),m());},t=exclude_internal_props(t),[h,a,c,v,r,d,u,f,s,g,o,l,(e,t)=>{g(t,e);},function(e){binding_callbacks[e?"unshift":"push"](()=>{r=e,n(4,r);});}]}class nl extends SvelteComponent{constructor(e){var t;super(),Kn.getElementById("svelte-4jfme-style")||((t=element("style")).id="svelte-4jfme-style",t.textContent=".tabbar.svelte-4jfme{width:100%;overflow:hidden}.tabbar-wrap.svelte-4jfme{display:flex;position:relative;transition:left 150ms}.tabbutton.svelte-4jfme{color:var(--color);min-width:70px;font-family:Roboto,sans-serif;-moz-osx-font-smoothing:grayscale;-webkit-font-smoothing:antialiased;font-size:.875rem;font-weight:500;letter-spacing:.08929em;text-decoration:none;text-transform:uppercase;position:relative;display:flex;flex:1 0 auto;justify-content:center;align-items:center;box-sizing:border-box;height:48px;margin:0 !important;padding:0 24px;border:none;outline:none;background:none;text-align:center;white-space:nowrap;cursor:pointer;-webkit-appearance:none;z-index:1}.tabbutton.svelte-4jfme:before{bottom:0;content:'';left:0;opacity:0;pointer-events:none;position:absolute;right:0;top:0;transition:0.2s cubic-bezier(0.25, 0.8, 0.5, 1);will-change:background-color, opacity}.tabbutton.svelte-4jfme:hover:before{background-color:currentColor;opacity:0.15}.tabbuttonactive.svelte-4jfme{color:var(--primary)}.tabcontent-wrap.svelte-4jfme{overflow:hidden;transition:none}.tabcontent.svelte-4jfme{display:flex;align-items:flex-start;flex-wrap:nowrap;transform:translate3d(0%, 0px, 0px);transition:transform .35s cubic-bezier(.4,0,.2,1);will-change:transform}.tabindicator.svelte-4jfme{height:2px;position:absolute;left:0;bottom:0;transition:left .2s cubic-bezier(.4,0,.2,1);background-color:var(--primary)}",append(Kn.head,t)),init(this,e,tl,el,safe_not_equal,{class:1,style:2,tabNames:3,activeTab:0});}}function ll(e){let t,n,o,i,r;const a=e[5].default,d=create_slot(a,e,e[4],null);let p=[{class:n="tabcontent-page "+e[0]},{style:e[1]},e[2]],v={};for(let e=0;e<p.length;e+=1)v=assign(v,p[e]);return {c(){t=element("div"),d&&d.c(),set_attributes(t,v),toggle_class(t,"svelte-1cy2yx5",!0);},m(n,s){insert(n,t,s),d&&d.m(t,null),o=!0,i||(r=action_destroyer(e[3].call(null,t)),i=!0);},p(e,[l]){d&&d.p&&16&l&&update_slot(d,a,e,e[4],l,null,null),set_attributes(t,v=get_spread_update(p,[(!o||1&l&&n!==(n="tabcontent-page "+e[0]))&&{class:n},(!o||2&l)&&{style:e[1]},4&l&&e[2]])),toggle_class(t,"svelte-1cy2yx5",!0);},i(e){o||(transition_in(d,e),o=!0);},o(e){transition_out(d,e),o=!1;},d(e){e&&detach(t),d&&d.d(e),i=!1,r();}}}function ol(e,t,n){let{$$slots:l={},$$scope:o}=t;const i=oe(current_component);let{class:s=""}=t,{style:r=null}=t,a={};return e.$$set=e=>{n(6,t=assign(assign({},t),exclude_internal_props(e))),"class"in e&&n(0,s=e.class),"style"in e&&n(1,r=e.style),"$$scope"in e&&n(4,o=e.$$scope);},e.$$.update=()=>{{const{style:e,...l}=t;n(2,a=l);}},t=exclude_internal_props(t),[s,r,a,i,o,l]}class il extends SvelteComponent{constructor(e){var t;super(),document.getElementById("svelte-1cy2yx5-style")||((t=element("style")).id="svelte-1cy2yx5-style",t.textContent=".tabcontent-page.svelte-1cy2yx5{width:100%;flex:1 0 100%}",append(document.head,t)),init(this,e,ol,ll,safe_not_equal,{class:0,style:1});}}

    const logger = (prefix='') => {
      return {
        debug: (msg, ...rest) => console.debug(`${prefix}${msg}`, ...rest),
        info:  (msg, ...rest) => console.info( `${prefix}${msg}`, ...rest),
        warn:  (msg, ...rest) => console.warn( `${prefix}${msg}`, ...rest),
        error: (msg, ...rest) => console.error(`${prefix}${msg}`, ...rest),
      }
    };

    /* src/HeaderBar.svelte generated by Svelte v3.37.0 */

    const file$g = "src/HeaderBar.svelte";

    function create_fragment$g(ctx) {
    	let div1;
    	let div0;
    	let t0;
    	let t1;
    	let span;
    	let t2;
    	let t3;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t0 = text(/*title*/ ctx[0]);
    			t1 = space();
    			span = element("span");
    			t2 = text("v");
    			t3 = text(/*version*/ ctx[1]);
    			attr_dev(span, "class", "version svelte-i20s24");
    			add_location(span, file$g, 34, 29, 598);
    			attr_dev(div0, "class", "title svelte-i20s24");
    			add_location(div0, file$g, 34, 2, 571);
    			attr_dev(div1, "class", "header-bar svelte-i20s24");
    			add_location(div1, file$g, 33, 0, 544);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, t0);
    			append_dev(div0, t1);
    			append_dev(div0, span);
    			append_dev(span, t2);
    			append_dev(span, t3);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*title*/ 1) set_data_dev(t0, /*title*/ ctx[0]);
    			if (dirty & /*version*/ 2) set_data_dev(t3, /*version*/ ctx[1]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$g.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$g($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("HeaderBar", slots, []);
    	let { title = "untitled" } = $$props;
    	let { version = "0.0.0" } = $$props;
    	const writable_props = ["title", "version"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<HeaderBar> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("version" in $$props) $$invalidate(1, version = $$props.version);
    	};

    	$$self.$capture_state = () => ({ title, version });

    	$$self.$inject_state = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("version" in $$props) $$invalidate(1, version = $$props.version);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [title, version];
    }

    class HeaderBar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$g, create_fragment$g, safe_not_equal, { title: 0, version: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "HeaderBar",
    			options,
    			id: create_fragment$g.name
    		});
    	}

    	get title() {
    		throw new Error("<HeaderBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<HeaderBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get version() {
    		throw new Error("<HeaderBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set version(value) {
    		throw new Error("<HeaderBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const TEAM = { HOME:'home', AWAY:'away' };

    const CONTACT = { PLAYER:'player', FLOOR:'floor', NET:'net' };

    const ACTION = {
      SERVE:'serve', ACE:'ace', SERVICE_ERROR:'service error',
      DIG_OR_ATTACK:'dig_or_attack', DIG:'dig', RECEPTION_ERROR:'reception error',
      PASS_OR_ATTACK:'pass_or_attack', PASS:'pass', PASSING_ERROR:'passing error',
      ATTACK:'attack', KILL:'kill', ATTACKING_ERROR:'attacking error',
      BLOCK_OR_ATTACK:'block_or_attack', BLOCK:'block', BLOCK_KILL:'block kill', BLOCKING_ERROR:'blocking error',
      VIOLATION:'violation',
    };

    const ACTION_POINT = [
      ACTION.ACE, ACTION.BLOCK, ACTION.KILL,
    ];

    const ACTION_CONTINUE = [
      ACTION.SERVE, ACTION.DIG, ACTION.PASS, ACTION.ATTACK,
    ];

    const ACTION_ERROR = [
      ACTION.SERVICE_ERROR, ACTION.BLOCKING_ERROR, ACTION.RECEPTION_ERROR,
      ACTION.PASSING_ERROR, ACTION.ATTACKING_ERROR, ACTION.VIOLATION,
    ];

    const PLAYER_STAT_COLUMNS = [
      CONTACT.PLAYER,
      ...ACTION_POINT,
      ...ACTION_CONTINUE,
      ...ACTION_ERROR,
    ];

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const match = writable({venue:'', date:'', sets:[]}); // array of sets .. array of rallies .. array of contacts

    /* src/icons/jersey.svg generated by Svelte v3.37.0 */

    const file$f = "src/icons/jersey.svg";

    function create_fragment$f(ctx) {
    	let svg;
    	let path0;
    	let path1;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			attr_dev(path0, "d", "M289.475 188.07L248.619 19.348a4.5 4.5 0 00-1.834-2.655L223.526.786a4.5 4.5 0 00-2.54-.786h-29.828a4.5 4.5 0 00-1.9.422l-42.2 19.69L104.237.414a4.493 4.493 0 00-1.881-.412H72.872a4.5 4.5 0 00-2.323.646L44.163 16.553a4.5 4.5 0 00-2.044 2.767L.137 188.042a4.5 4.5 0 003 5.374l32.229 10.285a4.5 4.5 0 005.739-3.215l26.41-107.672v148.943a4.5 4.5 0 004.5 4.5h148.286a4.5 4.5 0 004.5-4.5V95.022l24.372 105.406a4.5 4.5 0 005.78 3.264l31.542-10.285a4.5 4.5 0 002.98-5.337zm-101.518-75.642a7.855 7.855 0 01-5.1 1.479h-11.758l-3.536 25.139h10.443q6.579 0 6.579 5.5a4.672 4.672 0 01-1.727 3.7 6.123 6.123 0 01-4.521 1.568h-12.5l-4.358 30.89a9.33 9.33 0 01-1.644 5.258 6.8 6.8 0 01-4.6 1.314q-5.676 0-6.251-6.161a4.613 4.613 0 00.411-1.725l4.353-29.576h-20.23l-4.194 30.89q-.492 4.028-1.891 5.258a7.143 7.143 0 01-4.687 1.314q-5.428 0-5.921-6.161a7.611 7.611 0 00.329-2.054l3.947-29.247h-10.855a6.677 6.677 0 01-4.523-1.561 5.51 5.51 0 01-1.973-3.7q.492-5.5 7.236-5.5h11.76l3.536-25.139h-10.773a6.964 6.964 0 01-4.687-1.479 5.436 5.436 0 01-2.22-3.7 6.518 6.518 0 012.056-4.19 5.953 5.953 0 014.523-1.731h12.417l4.769-31.3q.492-4.189 1.974-5.176a7.992 7.992 0 014.276-1.068q5.508 0 5.509 5.916v2.053l-3.865 29.575h19.737l4.522-31.629q.576-3.451 1.975-4.683a8 8 0 014.6-1.233q5.508 0 5.509 7.641l-4.189 29.904h10.443a6.924 6.924 0 015.1 1.725 5.75 5.75 0 011.809 4.19 4.739 4.739 0 01-1.81 3.699z");
    			add_location(path0, file$f, 7, 2, 276);
    			attr_dev(path1, "d", "M135.245 139.047H154.9l3.7-25.14h-19.983l-3.372 25.14z");
    			add_location(path1, file$f, 8, 2, 1674);
    			attr_dev(svg, "viewBox", "0 0 289.602 246.257");
    			add_location(svg, file$f, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$f($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Jersey", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Jersey> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Jersey extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Jersey",
    			options,
    			id: create_fragment$f.name
    		});
    	}
    }

    /* src/icons/lightning.svg generated by Svelte v3.37.0 */

    const file$e = "src/icons/lightning.svg";

    function create_fragment$e(ctx) {
    	let svg;
    	let path;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M38.439 247.298a5 5 0 01-4.938-5.775l15.094-96.186H5a5 5 0 01-4.947-5.73l20-135.338A5 5 0 0125 0h101.978a5 5 0 014.706 6.688L98.457 99.324h49.1a5 5 0 013.922 8.1L42.362 245.4a5 5 0 01-3.923 1.898zM10.793 135.337h43.648a5 5 0 014.939 5.776l-13.047 83.145 90.894-114.934H91.35a5 5 0 01-4.706-6.688L119.872 10H29.315z");
    			add_location(path, file$e, 6, 2, 201);
    			attr_dev(svg, "viewBox", "0 0 152.557 247.299");
    			add_location(svg, file$e, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Lightning", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Lightning> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Lightning extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Lightning",
    			options,
    			id: create_fragment$e.name
    		});
    	}
    }

    /* src/icons/whistle.svg generated by Svelte v3.37.0 */

    const file$d = "src/icons/whistle.svg";

    function create_fragment$d(ctx) {
    	let svg;
    	let path0;
    	let path1;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			attr_dev(path0, "d", "M38.288 20.997a2 1.993 0 00-1.856 1.472l-1.949 6.813a2 1.993 0 103.847 1.092l1.949-6.813a2 1.993 0 00-1.991-2.564zM28.3 21.772a2 1.993 0 00-1.975 2.375l1.346 7.413a2 1.993 0 103.936-.71l-1.347-7.413a2 1.993 0 00-1.96-1.665zM17.519 26.9a2 1.993 0 00-1.342 3.517l5.775 4.978a2 1.993 0 102.618-3.014l-5.776-4.978a2 1.993 0 00-1.275-.503zM37.375 35.16c-10.252-.082-19.048 6.881-21.594 16.344-.965-.553-2.095-.906-3.281-.906-3.585 0-6.5 2.936-6.5 6.5 0 3.544 2.915 6.469 6.5 6.469a6.643 6.643 0 003.281-.875c2.51 9.362 11.131 16.312 21.407 16.312 9.13 0 16.95-5.51 20.343-13.281.035-.08.092-.17.125-.25 2.912-7.603 8.238-11.918 13.625-14.563 5.792-2.755 12.817-3.75 20.532-3.75 1.153 0 2.187-1.016 2.187-2.156v-7.656c0-1.14-1.034-2.187-2.187-2.188H38c-.234.01-.422-.012-.625 0zm24.063 4.344h1.53v2.406h-1.53v-2.406zm-24.25 3.5c7.828 0 14.28 6.315 14.28 14.094 0 7.78-6.452 14.125-14.28 14.125-7.861 0-14.313-6.346-14.313-14.125 0-7.78 6.452-14.094 14.313-14.094zM12.5 54.973c1.236 0 2.188.903 2.188 2.125 0 1.164-.952 2.125-2.188 2.125-1.177 0-2.094-.961-2.094-2.125 0-1.222.917-2.125 2.094-2.125z");
    			add_location(path0, file$d, 5, 2, 175);
    			attr_dev(path1, "d", "M37.195 47.365c5.444 0 9.86 4.327 9.86 9.746 0 5.418-4.416 9.746-9.86 9.746-5.49 0-9.898-4.328-9.898-9.746 0-5.419 4.408-9.746 9.898-9.746z");
    			add_location(path1, file$d, 6, 2, 1282);
    			attr_dev(svg, "viewBox", "0 0 100 100");
    			add_location(svg, file$d, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Whistle", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Whistle> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Whistle extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Whistle",
    			options,
    			id: create_fragment$d.name
    		});
    	}
    }

    /* src/Court.svelte generated by Svelte v3.37.0 */
    const file$c = "src/Court.svelte";

    function create_fragment$c(ctx) {
    	let svg_1;
    	let rect0;
    	let rect1;
    	let circle0;
    	let g0;
    	let rect2;
    	let line0;
    	let rect3;
    	let line1;
    	let g1;
    	let rect4;
    	let line2;
    	let line3;
    	let g2;
    	let rect5;
    	let line4;
    	let line5;
    	let line6;
    	let line7;
    	let rect6;
    	let rect7;
    	let g3;
    	let rect8;
    	let line8;
    	let line9;
    	let line10;
    	let line11;
    	let g4;
    	let rect9;
    	let line12;
    	let line13;
    	let g5;
    	let rect10;
    	let line14;
    	let rect11;
    	let line15;
    	let g6;
    	let circle1;
    	let rect12;
    	let line16;
    	let circle2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			svg_1 = svg_element("svg");
    			rect0 = svg_element("rect");
    			rect1 = svg_element("rect");
    			circle0 = svg_element("circle");
    			g0 = svg_element("g");
    			rect2 = svg_element("rect");
    			line0 = svg_element("line");
    			rect3 = svg_element("rect");
    			line1 = svg_element("line");
    			g1 = svg_element("g");
    			rect4 = svg_element("rect");
    			line2 = svg_element("line");
    			line3 = svg_element("line");
    			g2 = svg_element("g");
    			rect5 = svg_element("rect");
    			line4 = svg_element("line");
    			line5 = svg_element("line");
    			line6 = svg_element("line");
    			line7 = svg_element("line");
    			rect6 = svg_element("rect");
    			rect7 = svg_element("rect");
    			g3 = svg_element("g");
    			rect8 = svg_element("rect");
    			line8 = svg_element("line");
    			line9 = svg_element("line");
    			line10 = svg_element("line");
    			line11 = svg_element("line");
    			g4 = svg_element("g");
    			rect9 = svg_element("rect");
    			line12 = svg_element("line");
    			line13 = svg_element("line");
    			g5 = svg_element("g");
    			rect10 = svg_element("rect");
    			line14 = svg_element("line");
    			rect11 = svg_element("rect");
    			line15 = svg_element("line");
    			g6 = svg_element("g");
    			circle1 = svg_element("circle");
    			rect12 = svg_element("rect");
    			line16 = svg_element("line");
    			circle2 = svg_element("circle");
    			attr_dev(rect0, "class", "free svelte-1s8f166");
    			attr_dev(rect0, "width", "30");
    			attr_dev(rect0, "height", "15");
    			attr_dev(rect0, "rx", "1");
    			add_location(rect0, file$c, 95, 2, 2213);
    			attr_dev(rect1, "class", "court svelte-1s8f166");
    			attr_dev(rect1, "width", "18");
    			attr_dev(rect1, "height", "9");
    			attr_dev(rect1, "x", "6");
    			attr_dev(rect1, "y", "3");
    			add_location(rect1, file$c, 96, 2, 2267);
    			attr_dev(circle0, "id", "contact");
    			attr_dev(circle0, "class", "contact svelte-1s8f166");
    			attr_dev(circle0, "cx", "15");
    			attr_dev(circle0, "cy", "7.5");
    			attr_dev(circle0, "r", "0.105");
    			add_location(circle0, file$c, 98, 2, 2327);
    			attr_dev(rect2, "id", "free-home-top-area");
    			attr_dev(rect2, "class", "area svelte-1s8f166");
    			attr_dev(rect2, "width", "15");
    			attr_dev(rect2, "height", "3");
    			attr_dev(rect2, "x", "0");
    			attr_dev(rect2, "y", "0");
    			add_location(rect2, file$c, 101, 4, 2461);
    			attr_dev(line0, "id", "free-home-top-ext");
    			attr_dev(line0, "class", "boundary extension svelte-1s8f166");
    			attr_dev(line0, "x1", "12");
    			attr_dev(line0, "y1", "3");
    			attr_dev(line0, "x2", "12");
    			attr_dev(line0, "y2", "1.25");
    			add_location(line0, file$c, 102, 4, 2545);
    			attr_dev(rect3, "id", "free-away-top-area");
    			attr_dev(rect3, "class", "area svelte-1s8f166");
    			attr_dev(rect3, "width", "15");
    			attr_dev(rect3, "height", "3");
    			attr_dev(rect3, "x", "15");
    			attr_dev(rect3, "y", "0");
    			add_location(rect3, file$c, 103, 4, 2641);
    			attr_dev(line1, "id", "free-away-top-ext");
    			attr_dev(line1, "class", "boundary extension svelte-1s8f166");
    			attr_dev(line1, "x1", "18");
    			attr_dev(line1, "y1", "3");
    			attr_dev(line1, "x2", "18");
    			attr_dev(line1, "y2", "1.25");
    			add_location(line1, file$c, 104, 4, 2726);
    			attr_dev(g0, "class", "svelte-1s8f166");
    			add_location(g0, file$c, 100, 2, 2453);
    			attr_dev(rect4, "id", "free-home-service-area");
    			attr_dev(rect4, "class", "area svelte-1s8f166");
    			attr_dev(rect4, "width", "6");
    			attr_dev(rect4, "height", "9");
    			attr_dev(rect4, "x", "0");
    			attr_dev(rect4, "y", "3");
    			add_location(rect4, file$c, 107, 4, 2835);
    			attr_dev(line2, "id", "free-home-service-extA");
    			attr_dev(line2, "class", "boundary extension svelte-1s8f166");
    			attr_dev(line2, "x1", "6");
    			attr_dev(line2, "y1", "3");
    			attr_dev(line2, "x2", "4.25");
    			attr_dev(line2, "y2", "3");
    			add_location(line2, file$c, 108, 4, 2922);
    			attr_dev(line3, "id", "free-home-service-extB");
    			attr_dev(line3, "class", "boundary extension svelte-1s8f166");
    			attr_dev(line3, "x1", "6");
    			attr_dev(line3, "y1", "12");
    			attr_dev(line3, "x2", "4.25");
    			attr_dev(line3, "y2", "12");
    			add_location(line3, file$c, 109, 4, 3021);
    			attr_dev(g1, "class", "svelte-1s8f166");
    			add_location(g1, file$c, 106, 2, 2827);
    			attr_dev(rect5, "id", "court-home-area");
    			attr_dev(rect5, "class", "area svelte-1s8f166");
    			attr_dev(rect5, "width", "7.8");
    			attr_dev(rect5, "height", "9");
    			attr_dev(rect5, "x", "6");
    			attr_dev(rect5, "y", "3");
    			add_location(rect5, file$c, 112, 4, 3135);
    			attr_dev(line4, "id", "court-home-tapeA");
    			attr_dev(line4, "class", "court boundary svelte-1s8f166");
    			attr_dev(line4, "x1", "15");
    			attr_dev(line4, "y1", "12");
    			attr_dev(line4, "x2", "6");
    			attr_dev(line4, "y2", "12");
    			add_location(line4, file$c, 113, 4, 3218);
    			attr_dev(line5, "id", "court-home-tapeB");
    			attr_dev(line5, "class", "court boundary svelte-1s8f166");
    			attr_dev(line5, "x1", "6");
    			attr_dev(line5, "y1", "12");
    			attr_dev(line5, "x2", "6");
    			attr_dev(line5, "y2", "3");
    			add_location(line5, file$c, 114, 4, 3307);
    			attr_dev(line6, "id", "court-home-tapeC");
    			attr_dev(line6, "class", "court boundary svelte-1s8f166");
    			attr_dev(line6, "x1", "6");
    			attr_dev(line6, "y1", "3");
    			attr_dev(line6, "x2", "15");
    			attr_dev(line6, "y2", "3");
    			add_location(line6, file$c, 115, 4, 3394);
    			attr_dev(line7, "id", "court-home-tapeD");
    			attr_dev(line7, "class", "court boundary svelte-1s8f166");
    			attr_dev(line7, "x1", "12");
    			attr_dev(line7, "y1", "3");
    			attr_dev(line7, "x2", "12");
    			attr_dev(line7, "y2", "12");
    			add_location(line7, file$c, 116, 4, 3481);
    			attr_dev(g2, "class", "svelte-1s8f166");
    			add_location(g2, file$c, 111, 2, 3127);
    			attr_dev(rect6, "id", "block-home-area");
    			attr_dev(rect6, "class", "block area svelte-1s8f166");
    			attr_dev(rect6, "width", "0.8");
    			attr_dev(rect6, "height", "9");
    			attr_dev(rect6, "x", "13.8");
    			attr_dev(rect6, "y", "3");
    			add_location(rect6, file$c, 118, 2, 3575);
    			attr_dev(rect7, "id", "block-away-area");
    			attr_dev(rect7, "class", "block area svelte-1s8f166");
    			attr_dev(rect7, "width", "0.8");
    			attr_dev(rect7, "height", "9");
    			attr_dev(rect7, "x", "15.4");
    			attr_dev(rect7, "y", "3");
    			add_location(rect7, file$c, 119, 2, 3664);
    			attr_dev(rect8, "id", "court-away-area");
    			attr_dev(rect8, "class", "area svelte-1s8f166");
    			attr_dev(rect8, "width", "7.8");
    			attr_dev(rect8, "height", "9");
    			attr_dev(rect8, "x", "16.2");
    			attr_dev(rect8, "y", "3");
    			add_location(rect8, file$c, 121, 4, 3761);
    			attr_dev(line8, "id", "court-away-tapeA");
    			attr_dev(line8, "class", "court boundary svelte-1s8f166");
    			attr_dev(line8, "x1", "15");
    			attr_dev(line8, "y1", "3");
    			attr_dev(line8, "x2", "24");
    			attr_dev(line8, "y2", "3");
    			add_location(line8, file$c, 122, 4, 3847);
    			attr_dev(line9, "id", "court-away-tapeB");
    			attr_dev(line9, "class", "court boundary svelte-1s8f166");
    			attr_dev(line9, "x1", "24");
    			attr_dev(line9, "y1", "3");
    			attr_dev(line9, "x2", "24");
    			attr_dev(line9, "y2", "12");
    			add_location(line9, file$c, 123, 4, 3935);
    			attr_dev(line10, "id", "court-away-tapeC");
    			attr_dev(line10, "class", "court boundary svelte-1s8f166");
    			attr_dev(line10, "x1", "24");
    			attr_dev(line10, "y1", "12");
    			attr_dev(line10, "x2", "15");
    			attr_dev(line10, "y2", "12");
    			add_location(line10, file$c, 124, 4, 4024);
    			attr_dev(line11, "id", "court-away-tapeD");
    			attr_dev(line11, "class", "court boundary svelte-1s8f166");
    			attr_dev(line11, "x1", "18");
    			attr_dev(line11, "y1", "3");
    			attr_dev(line11, "x2", "18");
    			attr_dev(line11, "y2", "12");
    			add_location(line11, file$c, 125, 4, 4114);
    			attr_dev(g3, "class", "svelte-1s8f166");
    			add_location(g3, file$c, 120, 2, 3753);
    			attr_dev(rect9, "id", "free-away-service-area");
    			attr_dev(rect9, "class", "area svelte-1s8f166");
    			attr_dev(rect9, "width", "6");
    			attr_dev(rect9, "height", "9");
    			attr_dev(rect9, "x", "24");
    			attr_dev(rect9, "y", "3");
    			add_location(rect9, file$c, 128, 4, 4216);
    			attr_dev(line12, "id", "free-away-service-extA");
    			attr_dev(line12, "class", "boundary extension svelte-1s8f166");
    			attr_dev(line12, "x1", "24");
    			attr_dev(line12, "y1", "3");
    			attr_dev(line12, "x2", "25.75");
    			attr_dev(line12, "y2", "3");
    			add_location(line12, file$c, 129, 4, 4304);
    			attr_dev(line13, "id", "free-away-service-extB");
    			attr_dev(line13, "class", "boundary extension svelte-1s8f166");
    			attr_dev(line13, "x1", "24");
    			attr_dev(line13, "y1", "12");
    			attr_dev(line13, "x2", "25.75");
    			attr_dev(line13, "y2", "12");
    			add_location(line13, file$c, 130, 4, 4405);
    			attr_dev(g4, "class", "svelte-1s8f166");
    			add_location(g4, file$c, 127, 2, 4208);
    			attr_dev(rect10, "id", "free-away-bottom-area");
    			attr_dev(rect10, "class", "area svelte-1s8f166");
    			attr_dev(rect10, "width", "15");
    			attr_dev(rect10, "height", "3");
    			attr_dev(rect10, "x", "15");
    			attr_dev(rect10, "y", "12");
    			add_location(rect10, file$c, 133, 4, 4521);
    			attr_dev(line14, "id", "free-away-bottom-ext");
    			attr_dev(line14, "class", "boundary extension svelte-1s8f166");
    			attr_dev(line14, "x1", "12");
    			attr_dev(line14, "y1", "12");
    			attr_dev(line14, "x2", "12");
    			attr_dev(line14, "y2", "13.75");
    			add_location(line14, file$c, 134, 4, 4610);
    			attr_dev(rect11, "id", "free-home-bottom-area");
    			attr_dev(rect11, "class", "area svelte-1s8f166");
    			attr_dev(rect11, "width", "15");
    			attr_dev(rect11, "height", "3");
    			attr_dev(rect11, "x", "0");
    			attr_dev(rect11, "y", "12");
    			add_location(rect11, file$c, 135, 4, 4711);
    			attr_dev(line15, "id", "free-home-bottom-ext");
    			attr_dev(line15, "class", "boundary extension svelte-1s8f166");
    			attr_dev(line15, "x1", "18");
    			attr_dev(line15, "y1", "12");
    			attr_dev(line15, "x2", "18");
    			attr_dev(line15, "y2", "13.75");
    			add_location(line15, file$c, 136, 4, 4799);
    			attr_dev(g5, "class", "svelte-1s8f166");
    			add_location(g5, file$c, 132, 2, 4513);
    			attr_dev(circle1, "id", "net-post-top");
    			attr_dev(circle1, "class", "post svelte-1s8f166");
    			attr_dev(circle1, "cx", "15");
    			attr_dev(circle1, "cy", "2");
    			attr_dev(circle1, "r", "0.1012");
    			add_location(circle1, file$c, 140, 4, 4914);
    			attr_dev(rect12, "id", "net-area");
    			attr_dev(rect12, "class", "net area svelte-1s8f166");
    			attr_dev(rect12, "width", "0.8");
    			attr_dev(rect12, "height", "9");
    			attr_dev(rect12, "x", "14.6");
    			attr_dev(rect12, "y", "3");
    			add_location(rect12, file$c, 141, 4, 5064);
    			attr_dev(line16, "id", "net-tape");
    			attr_dev(line16, "class", "court boundary svelte-1s8f166");
    			attr_dev(line16, "x1", "15");
    			attr_dev(line16, "y1", "3");
    			attr_dev(line16, "x2", "15");
    			attr_dev(line16, "y2", "12");
    			add_location(line16, file$c, 142, 4, 5148);
    			attr_dev(circle2, "id", "net-post-bottom");
    			attr_dev(circle2, "class", "post svelte-1s8f166");
    			attr_dev(circle2, "cx", "15");
    			attr_dev(circle2, "cy", "13");
    			attr_dev(circle2, "r", "0.1012");
    			add_location(circle2, file$c, 143, 4, 5231);
    			attr_dev(g6, "class", "svelte-1s8f166");
    			add_location(g6, file$c, 139, 2, 4906);
    			attr_dev(svg_1, "id", "play-area");
    			attr_dev(svg_1, "viewBox", "3 1.5 24 12");
    			attr_dev(svg_1, "class", "svelte-1s8f166");
    			add_location(svg_1, file$c, 94, 0, 2068);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg_1, anchor);
    			append_dev(svg_1, rect0);
    			append_dev(svg_1, rect1);
    			append_dev(svg_1, circle0);
    			append_dev(svg_1, g0);
    			append_dev(g0, rect2);
    			append_dev(g0, line0);
    			append_dev(g0, rect3);
    			append_dev(g0, line1);
    			append_dev(svg_1, g1);
    			append_dev(g1, rect4);
    			append_dev(g1, line2);
    			append_dev(g1, line3);
    			append_dev(svg_1, g2);
    			append_dev(g2, rect5);
    			append_dev(g2, line4);
    			append_dev(g2, line5);
    			append_dev(g2, line6);
    			append_dev(g2, line7);
    			append_dev(svg_1, rect6);
    			append_dev(svg_1, rect7);
    			append_dev(svg_1, g3);
    			append_dev(g3, rect8);
    			append_dev(g3, line8);
    			append_dev(g3, line9);
    			append_dev(g3, line10);
    			append_dev(g3, line11);
    			append_dev(svg_1, g4);
    			append_dev(g4, rect9);
    			append_dev(g4, line12);
    			append_dev(g4, line13);
    			append_dev(svg_1, g5);
    			append_dev(g5, rect10);
    			append_dev(g5, line14);
    			append_dev(g5, rect11);
    			append_dev(g5, line15);
    			append_dev(svg_1, g6);
    			append_dev(g6, circle1);
    			append_dev(g6, rect12);
    			append_dev(g6, line16);
    			append_dev(g6, circle2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(svg_1, "click", /*on_click*/ ctx[0], false, false, false),
    					listen_dev(svg_1, "mousemove", /*on_move*/ ctx[1], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg_1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Court", slots, []);
    	const dispatch = createEventDispatcher();
    	let svg;
    	let contact;

    	const on_click = mouse_event => {
    		const loc = screen_to_svg(svg, mouse_event.clientX, mouse_event.clientY);

    		dispatch("contact", {
    			area_id: mouse_event.target.getAttribute("id"),
    			court_x: Math.round(loc.x * 1000), // mm
    			court_y: Math.round(loc.y * 1000),
    			el_x: mouse_event.offsetX, // px
    			el_y: mouse_event.offsetY,
    			el_rect: svg.parentElement.getBoundingClientRect(),
    			source_event: mouse_event
    		});
    	};

    	const on_move = mouse_event => {
    		const loc = screen_to_svg(svg, mouse_event.clientX, mouse_event.clientY);
    		contact.setAttributeNS(null, "cx", loc.x);
    		contact.setAttributeNS(null, "cy", loc.y);
    	};

    	const screen_to_svg = (svg, x, y) => {
    		// transforms {x,y} in screen space (pixels), to coordinates in svg space (arbitrary units)
    		const svgpt = svg.createSVGPoint();

    		svgpt.x = x;
    		svgpt.y = y;
    		return svgpt.matrixTransform(svg.getScreenCTM().inverse());
    	};

    	onMount(async () => {
    		svg = document.getElementById("play-area");
    		contact = document.getElementById("contact");
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Court> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		createEventDispatcher,
    		dispatch,
    		svg,
    		contact,
    		on_click,
    		on_move,
    		screen_to_svg
    	});

    	$$self.$inject_state = $$props => {
    		if ("svg" in $$props) svg = $$props.svg;
    		if ("contact" in $$props) contact = $$props.contact;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [on_click, on_move];
    }

    class Court extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Court",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    /* src/JerseyPicker.svelte generated by Svelte v3.37.0 */
    const file$b = "src/JerseyPicker.svelte";

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	child_ctx[12] = i;
    	return child_ctx;
    }

    // (46:8) <Button color="var(--alternate)"                 dense fullWidth toggle                 active={numbers[i]}                 on:click={()=>on_num_clicked(i)}>
    function create_default_slot_3$4(ctx) {
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			t0 = text(/*i*/ ctx[12]);
    			t1 = space();
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3$4.name,
    		type: "slot",
    		source: "(46:8) <Button color=\\\"var(--alternate)\\\"                 dense fullWidth toggle                 active={numbers[i]}                 on:click={()=>on_num_clicked(i)}>",
    		ctx
    	});

    	return block;
    }

    // (45:4) {#each (new Array(100).fill(0)) as _,i }
    function create_each_block$4(ctx) {
    	let li;
    	let button;
    	let current;

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[7](/*i*/ ctx[12]);
    	}

    	button = new ye({
    			props: {
    				color: "var(--alternate)",
    				dense: true,
    				fullWidth: true,
    				toggle: true,
    				active: /*numbers*/ ctx[2][/*i*/ ctx[12]],
    				$$slots: { default: [create_default_slot_3$4] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button.$on("click", click_handler_2);

    	const block = {
    		c: function create() {
    			li = element("li");
    			create_component(button.$$.fragment);
    			add_location(li, file$b, 45, 4, 1100);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			mount_component(button, li, null);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const button_changes = {};
    			if (dirty & /*numbers*/ 4) button_changes.active = /*numbers*/ ctx[2][/*i*/ ctx[12]];

    			if (dirty & /*$$scope*/ 8192) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			destroy_component(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$4.name,
    		type: "each",
    		source: "(45:4) {#each (new Array(100).fill(0)) as _,i }",
    		ctx
    	});

    	return block;
    }

    // (41:0) <Dialog bind:visible>
    function create_default_slot_2$4(ctx) {
    	let ul;
    	let current;
    	let each_value = new Array(100).fill(0);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(ul, "class", "numbers svelte-2i6665");
    			add_location(ul, file$b, 43, 2, 1030);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*numbers, on_num_clicked*/ 20) {
    				each_value = new Array(100).fill(0);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$4(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$4(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(ul, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2$4.name,
    		type: "slot",
    		source: "(41:0) <Dialog bind:visible>",
    		ctx
    	});

    	return block;
    }

    // (42:2) 
    function create_title_slot(ctx) {
    	let div;
    	let t0;
    	let t1_value = /*jerseys*/ ctx[0].length + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("Select player jerseys (");
    			t1 = text(t1_value);
    			t2 = text(")");
    			set_style(div, "user-select", "none");
    			attr_dev(div, "slot", "title");
    			add_location(div, file$b, 41, 2, 935);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*jerseys*/ 1 && t1_value !== (t1_value = /*jerseys*/ ctx[0].length + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_title_slot.name,
    		type: "slot",
    		source: "(42:2) ",
    		ctx
    	});

    	return block;
    }

    // (55:4) <Button color="primary" on:click={()=>on_clear()}>
    function create_default_slot_1$7(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Clear");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$7.name,
    		type: "slot",
    		source: "(55:4) <Button color=\\\"primary\\\" on:click={()=>on_clear()}>",
    		ctx
    	});

    	return block;
    }

    // (56:4) <Button color="primary" on:click={()=>visible=false}>
    function create_default_slot$7(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Done");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$7.name,
    		type: "slot",
    		source: "(56:4) <Button color=\\\"primary\\\" on:click={()=>visible=false}>",
    		ctx
    	});

    	return block;
    }

    // (54:2) 
    function create_actions_slot(ctx) {
    	let div;
    	let button0;
    	let t;
    	let button1;
    	let current;

    	button0 = new ye({
    			props: {
    				color: "primary",
    				$$slots: { default: [create_default_slot_1$7] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button0.$on("click", /*click_handler*/ ctx[5]);

    	button1 = new ye({
    			props: {
    				color: "primary",
    				$$slots: { default: [create_default_slot$7] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button1.$on("click", /*click_handler_1*/ ctx[6]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(button0.$$.fragment);
    			t = space();
    			create_component(button1.$$.fragment);
    			attr_dev(div, "slot", "actions");
    			attr_dev(div, "class", "actions center");
    			add_location(div, file$b, 53, 2, 1309);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(button0, div, null);
    			append_dev(div, t);
    			mount_component(button1, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const button0_changes = {};

    			if (dirty & /*$$scope*/ 8192) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			const button1_changes = {};

    			if (dirty & /*$$scope*/ 8192) {
    				button1_changes.$$scope = { dirty, ctx };
    			}

    			button1.$set(button1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button0.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(button0);
    			destroy_component(button1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_actions_slot.name,
    		type: "slot",
    		source: "(54:2) ",
    		ctx
    	});

    	return block;
    }

    function create_fragment$b(ctx) {
    	let dialog;
    	let updating_visible;
    	let current;

    	function dialog_visible_binding(value) {
    		/*dialog_visible_binding*/ ctx[8](value);
    	}

    	let dialog_props = {
    		$$slots: {
    			actions: [create_actions_slot],
    			title: [create_title_slot],
    			default: [create_default_slot_2$4]
    		},
    		$$scope: { ctx }
    	};

    	if (/*visible*/ ctx[1] !== void 0) {
    		dialog_props.visible = /*visible*/ ctx[1];
    	}

    	dialog = new pn({ props: dialog_props, $$inline: true });
    	binding_callbacks.push(() => bind(dialog, "visible", dialog_visible_binding));

    	const block = {
    		c: function create() {
    			create_component(dialog.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(dialog, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const dialog_changes = {};

    			if (dirty & /*$$scope, visible, jerseys, numbers*/ 8199) {
    				dialog_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_visible && dirty & /*visible*/ 2) {
    				updating_visible = true;
    				dialog_changes.visible = /*visible*/ ctx[1];
    				add_flush_callback(() => updating_visible = false);
    			}

    			dialog.$set(dialog_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(dialog.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(dialog.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(dialog, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("JerseyPicker", slots, []);
    	let { jerseys = [] } = $$props;
    	let { visible = false } = $$props;
    	const log = logger("jersey picker: ");
    	const numbers = new Array(100).fill(false);

    	const on_clear = () => {
    		log.debug("clearing numbers...");
    		numbers.forEach((v, i) => $$invalidate(2, numbers[i] = false, numbers));
    		$$invalidate(0, jerseys = []);
    	};

    	const on_num_clicked = n => {
    		$$invalidate(2, numbers[n] = !numbers[n], numbers);
    		$$invalidate(0, jerseys = numbers.reduce((a, v, i) => v ? a.concat(i) : a, []));
    		log.debug(`clicked ${n}, jersey ${numbers[n] ? "" : "de-"}selected`);
    	};

    	onMount(async () => {
    		jerseys.forEach(n => $$invalidate(2, numbers[n] = true, numbers));
    	});

    	const writable_props = ["jerseys", "visible"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<JerseyPicker> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => on_clear();
    	const click_handler_1 = () => $$invalidate(1, visible = false);
    	const click_handler_2 = i => on_num_clicked(i);

    	function dialog_visible_binding(value) {
    		visible = value;
    		$$invalidate(1, visible);
    	}

    	$$self.$$set = $$props => {
    		if ("jerseys" in $$props) $$invalidate(0, jerseys = $$props.jerseys);
    		if ("visible" in $$props) $$invalidate(1, visible = $$props.visible);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		Dialog: pn,
    		Button: ye,
    		logger,
    		jerseys,
    		visible,
    		log,
    		numbers,
    		on_clear,
    		on_num_clicked
    	});

    	$$self.$inject_state = $$props => {
    		if ("jerseys" in $$props) $$invalidate(0, jerseys = $$props.jerseys);
    		if ("visible" in $$props) $$invalidate(1, visible = $$props.visible);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		jerseys,
    		visible,
    		numbers,
    		on_clear,
    		on_num_clicked,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		dialog_visible_binding
    	];
    }

    class JerseyPicker extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, { jerseys: 0, visible: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "JerseyPicker",
    			options,
    			id: create_fragment$b.name
    		});
    	}

    	get jerseys() {
    		throw new Error("<JerseyPicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set jerseys(value) {
    		throw new Error("<JerseyPicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get visible() {
    		throw new Error("<JerseyPicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set visible(value) {
    		throw new Error("<JerseyPicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Score.svelte generated by Svelte v3.37.0 */
    const file$a = "src/Score.svelte";

    function create_fragment$a(ctx) {
    	let div5;
    	let div0;
    	let span0;
    	let t0_value = /*home_score*/ ctx[1].toString().padStart(2, "0") + "";
    	let t0;
    	let t1;
    	let div1;
    	let span1;
    	let t2;
    	let t3;
    	let div2;
    	let t4;
    	let t5;
    	let div3;
    	let span2;
    	let t6;
    	let t7;
    	let div4;
    	let span3;
    	let t8_value = /*away_score*/ ctx[3].toString().padStart(2, "0") + "";
    	let t8;

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div0 = element("div");
    			span0 = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			span1 = element("span");
    			t2 = text(/*home_sets*/ ctx[2]);
    			t3 = space();
    			div2 = element("div");
    			t4 = text(/*current_set*/ ctx[0]);
    			t5 = space();
    			div3 = element("div");
    			span2 = element("span");
    			t6 = text(/*away_sets*/ ctx[4]);
    			t7 = space();
    			div4 = element("div");
    			span3 = element("span");
    			t8 = text(t8_value);
    			attr_dev(span0, "class", "home score svelte-1swy6ho");
    			add_location(span0, file$a, 53, 20, 962);
    			attr_dev(div0, "class", "digits svelte-1swy6ho");
    			add_location(div0, file$a, 53, 0, 942);
    			attr_dev(span1, "class", "home sets svelte-1swy6ho");
    			add_location(span1, file$a, 54, 20, 1060);
    			attr_dev(div1, "class", "digits svelte-1swy6ho");
    			add_location(div1, file$a, 54, 0, 1040);
    			attr_dev(div2, "class", "set svelte-1swy6ho");
    			add_location(div2, file$a, 55, 0, 1109);
    			attr_dev(span2, "class", "away sets svelte-1swy6ho");
    			add_location(span2, file$a, 56, 20, 1166);
    			attr_dev(div3, "class", "digits svelte-1swy6ho");
    			add_location(div3, file$a, 56, 0, 1146);
    			attr_dev(span3, "class", "away score svelte-1swy6ho");
    			add_location(span3, file$a, 57, 20, 1235);
    			attr_dev(div4, "class", "digits svelte-1swy6ho");
    			add_location(div4, file$a, 57, 0, 1215);
    			attr_dev(div5, "class", "scoreboard svelte-1swy6ho");
    			add_location(div5, file$a, 52, 0, 917);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div0);
    			append_dev(div0, span0);
    			append_dev(span0, t0);
    			append_dev(div5, t1);
    			append_dev(div5, div1);
    			append_dev(div1, span1);
    			append_dev(span1, t2);
    			append_dev(div5, t3);
    			append_dev(div5, div2);
    			append_dev(div2, t4);
    			append_dev(div5, t5);
    			append_dev(div5, div3);
    			append_dev(div3, span2);
    			append_dev(span2, t6);
    			append_dev(div5, t7);
    			append_dev(div5, div4);
    			append_dev(div4, span3);
    			append_dev(span3, t8);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*home_score*/ 2 && t0_value !== (t0_value = /*home_score*/ ctx[1].toString().padStart(2, "0") + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*home_sets*/ 4) set_data_dev(t2, /*home_sets*/ ctx[2]);
    			if (dirty & /*current_set*/ 1) set_data_dev(t4, /*current_set*/ ctx[0]);
    			if (dirty & /*away_sets*/ 16) set_data_dev(t6, /*away_sets*/ ctx[4]);
    			if (dirty & /*away_score*/ 8 && t8_value !== (t8_value = /*away_score*/ ctx[3].toString().padStart(2, "0") + "")) set_data_dev(t8, t8_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Score", slots, []);
    	let { current_set = 0 } = $$props;
    	let { home_score = 0 } = $$props;
    	let { home_sets = 0 } = $$props;
    	let { away_score = 0 } = $$props;
    	let { away_sets = 0 } = $$props;
    	const writable_props = ["current_set", "home_score", "home_sets", "away_score", "away_sets"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Score> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("current_set" in $$props) $$invalidate(0, current_set = $$props.current_set);
    		if ("home_score" in $$props) $$invalidate(1, home_score = $$props.home_score);
    		if ("home_sets" in $$props) $$invalidate(2, home_sets = $$props.home_sets);
    		if ("away_score" in $$props) $$invalidate(3, away_score = $$props.away_score);
    		if ("away_sets" in $$props) $$invalidate(4, away_sets = $$props.away_sets);
    	};

    	$$self.$capture_state = () => ({
    		logger,
    		current_set,
    		home_score,
    		home_sets,
    		away_score,
    		away_sets
    	});

    	$$self.$inject_state = $$props => {
    		if ("current_set" in $$props) $$invalidate(0, current_set = $$props.current_set);
    		if ("home_score" in $$props) $$invalidate(1, home_score = $$props.home_score);
    		if ("home_sets" in $$props) $$invalidate(2, home_sets = $$props.home_sets);
    		if ("away_score" in $$props) $$invalidate(3, away_score = $$props.away_score);
    		if ("away_sets" in $$props) $$invalidate(4, away_sets = $$props.away_sets);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [current_set, home_score, home_sets, away_score, away_sets];
    }

    class Score extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {
    			current_set: 0,
    			home_score: 1,
    			home_sets: 2,
    			away_score: 3,
    			away_sets: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Score",
    			options,
    			id: create_fragment$a.name
    		});
    	}

    	get current_set() {
    		throw new Error("<Score>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set current_set(value) {
    		throw new Error("<Score>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get home_score() {
    		throw new Error("<Score>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set home_score(value) {
    		throw new Error("<Score>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get home_sets() {
    		throw new Error("<Score>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set home_sets(value) {
    		throw new Error("<Score>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get away_score() {
    		throw new Error("<Score>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set away_score(value) {
    		throw new Error("<Score>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get away_sets() {
    		throw new Error("<Score>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set away_sets(value) {
    		throw new Error("<Score>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/ServingTeamPicker.svelte generated by Svelte v3.37.0 */
    const file$9 = "src/ServingTeamPicker.svelte";

    // (73:6) <Button color="var(--team-home-rgb)" on:click={emit_home}>
    function create_default_slot_1$6(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("◀︎ Home");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$6.name,
    		type: "slot",
    		source: "(73:6) <Button color=\\\"var(--team-home-rgb)\\\" on:click={emit_home}>",
    		ctx
    	});

    	return block;
    }

    // (74:6) <Button color="var(--team-away-rgb)" on:click={emit_away}>
    function create_default_slot$6(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Away ▶︎");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$6.name,
    		type: "slot",
    		source: "(74:6) <Button color=\\\"var(--team-away-rgb)\\\" on:click={emit_away}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let div2;
    	let div1;
    	let h3;
    	let t1;
    	let div0;
    	let button0;
    	let t2;
    	let button1;
    	let current;

    	button0 = new ye({
    			props: {
    				color: "var(--team-home-rgb)",
    				$$slots: { default: [create_default_slot_1$6] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button0.$on("click", /*emit_home*/ ctx[0]);

    	button1 = new ye({
    			props: {
    				color: "var(--team-away-rgb)",
    				$$slots: { default: [create_default_slot$6] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button1.$on("click", /*emit_away*/ ctx[1]);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Select serving team";
    			t1 = space();
    			div0 = element("div");
    			create_component(button0.$$.fragment);
    			t2 = space();
    			create_component(button1.$$.fragment);
    			attr_dev(h3, "class", "title svelte-175gsxt");
    			add_location(h3, file$9, 69, 4, 1511);
    			attr_dev(div0, "class", "actions center svelte-175gsxt");
    			add_location(div0, file$9, 71, 4, 1559);
    			attr_dev(div1, "class", "dialog svelte-175gsxt");
    			add_location(div1, file$9, 68, 2, 1486);
    			attr_dev(div2, "class", "overlay svelte-175gsxt");
    			add_location(div2, file$9, 67, 0, 1462);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, h3);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			mount_component(button0, div0, null);
    			append_dev(div0, t2);
    			mount_component(button1, div0, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const button0_changes = {};

    			if (dirty & /*$$scope*/ 16) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			const button1_changes = {};

    			if (dirty & /*$$scope*/ 16) {
    				button1_changes.$$scope = { dirty, ctx };
    			}

    			button1.$set(button1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button0.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_component(button0);
    			destroy_component(button1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ServingTeamPicker", slots, []);
    	const log = logger("serving team picker: ");
    	const dispatch = createEventDispatcher();

    	const emit_home = () => {
    		dispatch("team_selected", { team: TEAM.HOME });
    	};

    	const emit_away = () => {
    		dispatch("team_selected", { team: TEAM.AWAY });
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ServingTeamPicker> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		Button: ye,
    		TEAM,
    		logger,
    		log,
    		dispatch,
    		emit_home,
    		emit_away
    	});

    	return [emit_home, emit_away];
    }

    class ServingTeamPicker extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ServingTeamPicker",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src/SpeedCourt.svelte generated by Svelte v3.37.0 */
    const file$8 = "src/SpeedCourt.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[20] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[20] = list[i];
    	return child_ctx;
    }

    function get_each_context_2$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[25] = list[i];
    	return child_ctx;
    }

    function get_each_context_3$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[28] = list[i];
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[28] = list[i];
    	return child_ctx;
    }

    function get_each_context_5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[25] = list[i];
    	return child_ctx;
    }

    // (135:10) <Button color="var(--alternate)"               dense fullWidth outlined               on:click={()=>on_floor(TEAM.HOME, f)}>
    function create_default_slot_5$1(ctx) {
    	let t0_value = /*f*/ ctx[25] + "";
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			t0 = text(t0_value);
    			t1 = space();
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_5$1.name,
    		type: "slot",
    		source: "(135:10) <Button color=\\\"var(--alternate)\\\"               dense fullWidth outlined               on:click={()=>on_floor(TEAM.HOME, f)}>",
    		ctx
    	});

    	return block;
    }

    // (134:6) {#each floor_contacts as f }
    function create_each_block_5(ctx) {
    	let li;
    	let button;
    	let current;

    	function click_handler() {
    		return /*click_handler*/ ctx[10](/*f*/ ctx[25]);
    	}

    	button = new ye({
    			props: {
    				color: "var(--alternate)",
    				dense: true,
    				fullWidth: true,
    				outlined: true,
    				$$slots: { default: [create_default_slot_5$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button.$on("click", click_handler);

    	const block = {
    		c: function create() {
    			li = element("li");
    			create_component(button.$$.fragment);
    			add_location(li, file$8, 134, 6, 3436);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			mount_component(button, li, null);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const button_changes = {};

    			if (dirty[1] & /*$$scope*/ 16) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			destroy_component(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_5.name,
    		type: "each",
    		source: "(134:6) {#each floor_contacts as f }",
    		ctx
    	});

    	return block;
    }

    // (145:10) <Button color="var(--alternate)"                   dense fullWidth outlined                   on:click={()=>on_player(j)}>
    function create_default_slot_4$2(ctx) {
    	let t0_value = /*j*/ ctx[28] + "";
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			t0 = text(t0_value);
    			t1 = space();
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*home_jerseys*/ 4 && t0_value !== (t0_value = /*j*/ ctx[28] + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_4$2.name,
    		type: "slot",
    		source: "(145:10) <Button color=\\\"var(--alternate)\\\"                   dense fullWidth outlined                   on:click={()=>on_player(j)}>",
    		ctx
    	});

    	return block;
    }

    // (144:6) {#each home_jerseys as j }
    function create_each_block_4(ctx) {
    	let li;
    	let button;
    	let current;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[11](/*j*/ ctx[28]);
    	}

    	button = new ye({
    			props: {
    				color: "var(--alternate)",
    				dense: true,
    				fullWidth: true,
    				outlined: true,
    				$$slots: { default: [create_default_slot_4$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button.$on("click", click_handler_1);

    	const block = {
    		c: function create() {
    			li = element("li");
    			create_component(button.$$.fragment);
    			add_location(li, file$8, 144, 6, 3698);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			mount_component(button, li, null);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const button_changes = {};

    			if (dirty[0] & /*home_jerseys*/ 4 | dirty[1] & /*$$scope*/ 16) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			destroy_component(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_4.name,
    		type: "each",
    		source: "(144:6) {#each home_jerseys as j }",
    		ctx
    	});

    	return block;
    }

    // (155:10) <Button color="var(--alternate)"                   dense fullWidth outlined                   on:click={()=>on_player(j, true)}>
    function create_default_slot_3$3(ctx) {
    	let t0_value = /*j*/ ctx[28] + "";
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			t0 = text(t0_value);
    			t1 = space();
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*home_jerseys*/ 4 && t0_value !== (t0_value = /*j*/ ctx[28] + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3$3.name,
    		type: "slot",
    		source: "(155:10) <Button color=\\\"var(--alternate)\\\"                   dense fullWidth outlined                   on:click={()=>on_player(j, true)}>",
    		ctx
    	});

    	return block;
    }

    // (154:6) {#each home_jerseys as j }
    function create_each_block_3$1(ctx) {
    	let li;
    	let button;
    	let current;

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[12](/*j*/ ctx[28]);
    	}

    	button = new ye({
    			props: {
    				color: "var(--alternate)",
    				dense: true,
    				fullWidth: true,
    				outlined: true,
    				$$slots: { default: [create_default_slot_3$3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button.$on("click", click_handler_2);

    	const block = {
    		c: function create() {
    			li = element("li");
    			create_component(button.$$.fragment);
    			add_location(li, file$8, 154, 6, 3965);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			mount_component(button, li, null);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const button_changes = {};

    			if (dirty[0] & /*home_jerseys*/ 4 | dirty[1] & /*$$scope*/ 16) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			destroy_component(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3$1.name,
    		type: "each",
    		source: "(154:6) {#each home_jerseys as j }",
    		ctx
    	});

    	return block;
    }

    // (171:10) <Button color="var(--alternate)"               dense fullWidth outlined               on:click={()=>on_floor(TEAM.AWAY, f)}>
    function create_default_slot_2$3(ctx) {
    	let t0_value = /*f*/ ctx[25] + "";
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			t0 = text(t0_value);
    			t1 = space();
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2$3.name,
    		type: "slot",
    		source: "(171:10) <Button color=\\\"var(--alternate)\\\"               dense fullWidth outlined               on:click={()=>on_floor(TEAM.AWAY, f)}>",
    		ctx
    	});

    	return block;
    }

    // (170:6) {#each floor_contacts as f }
    function create_each_block_2$3(ctx) {
    	let li;
    	let button;
    	let current;

    	function click_handler_4() {
    		return /*click_handler_4*/ ctx[14](/*f*/ ctx[25]);
    	}

    	button = new ye({
    			props: {
    				color: "var(--alternate)",
    				dense: true,
    				fullWidth: true,
    				outlined: true,
    				$$slots: { default: [create_default_slot_2$3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button.$on("click", click_handler_4);

    	const block = {
    		c: function create() {
    			li = element("li");
    			create_component(button.$$.fragment);
    			add_location(li, file$8, 170, 6, 4500);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			mount_component(button, li, null);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const button_changes = {};

    			if (dirty[1] & /*$$scope*/ 16) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			destroy_component(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2$3.name,
    		type: "each",
    		source: "(170:6) {#each floor_contacts as f }",
    		ctx
    	});

    	return block;
    }

    // (181:10) <Button color="var(--alternate)"               dense outlined shaped               on:click={()=>on_touches(t)}>
    function create_default_slot_1$5(ctx) {
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			t0 = text(/*t*/ ctx[20]);
    			t1 = space();
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$5.name,
    		type: "slot",
    		source: "(181:10) <Button color=\\\"var(--alternate)\\\"               dense outlined shaped               on:click={()=>on_touches(t)}>",
    		ctx
    	});

    	return block;
    }

    // (180:6) {#each [1,2,3,4] as t }
    function create_each_block_1$3(ctx) {
    	let li;
    	let button;
    	let current;

    	function click_handler_5() {
    		return /*click_handler_5*/ ctx[15](/*t*/ ctx[20]);
    	}

    	button = new ye({
    			props: {
    				color: "var(--alternate)",
    				dense: true,
    				outlined: true,
    				shaped: true,
    				$$slots: { default: [create_default_slot_1$5] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button.$on("click", click_handler_5);

    	const block = {
    		c: function create() {
    			li = element("li");
    			create_component(button.$$.fragment);
    			add_location(li, file$8, 180, 6, 4759);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			mount_component(button, li, null);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const button_changes = {};

    			if (dirty[1] & /*$$scope*/ 16) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			destroy_component(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$3.name,
    		type: "each",
    		source: "(180:6) {#each [1,2,3,4] as t }",
    		ctx
    	});

    	return block;
    }

    // (191:10) <Button color="var(--alternate)"               dense outlined shaped               on:click={()=>on_touches(t, true)}>
    function create_default_slot$5(ctx) {
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			t0 = text(/*t*/ ctx[20]);
    			t1 = space();
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$5.name,
    		type: "slot",
    		source: "(191:10) <Button color=\\\"var(--alternate)\\\"               dense outlined shaped               on:click={()=>on_touches(t, true)}>",
    		ctx
    	});

    	return block;
    }

    // (190:6) {#each [1,2,3,4] as t }
    function create_each_block$3(ctx) {
    	let li;
    	let button;
    	let current;

    	function click_handler_6() {
    		return /*click_handler_6*/ ctx[16](/*t*/ ctx[20]);
    	}

    	button = new ye({
    			props: {
    				color: "var(--alternate)",
    				dense: true,
    				outlined: true,
    				shaped: true,
    				$$slots: { default: [create_default_slot$5] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button.$on("click", click_handler_6);

    	const block = {
    		c: function create() {
    			li = element("li");
    			create_component(button.$$.fragment);
    			add_location(li, file$8, 190, 6, 5013);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			mount_component(button, li, null);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const button_changes = {};

    			if (dirty[1] & /*$$scope*/ 16) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			destroy_component(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(190:6) {#each [1,2,3,4] as t }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$8(ctx) {
    	let div7;
    	let div2;
    	let div0;
    	let t0;
    	let div1;
    	let t1_value = /*state_for_team*/ ctx[3](TEAM.HOME) + "";
    	let t1;
    	let t2;
    	let ul0;
    	let t3;
    	let br0;
    	let t4;
    	let ul1;
    	let t5;
    	let br1;
    	let t6;
    	let ul2;
    	let t7;
    	let div3;
    	let span;
    	let t9;
    	let div6;
    	let div4;
    	let t10;
    	let div5;
    	let t11_value = /*state_for_team*/ ctx[3](TEAM.AWAY) + "";
    	let t11;
    	let t12;
    	let ul3;
    	let t13;
    	let br2;
    	let t14;
    	let ul4;
    	let t15;
    	let br3;
    	let t16;
    	let ul5;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value_5 = /*floor_contacts*/ ctx[4];
    	validate_each_argument(each_value_5);
    	let each_blocks_5 = [];

    	for (let i = 0; i < each_value_5.length; i += 1) {
    		each_blocks_5[i] = create_each_block_5(get_each_context_5(ctx, each_value_5, i));
    	}

    	const out = i => transition_out(each_blocks_5[i], 1, 1, () => {
    		each_blocks_5[i] = null;
    	});

    	let each_value_4 = /*home_jerseys*/ ctx[2];
    	validate_each_argument(each_value_4);
    	let each_blocks_4 = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks_4[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	const out_1 = i => transition_out(each_blocks_4[i], 1, 1, () => {
    		each_blocks_4[i] = null;
    	});

    	let each_value_3 = /*home_jerseys*/ ctx[2];
    	validate_each_argument(each_value_3);
    	let each_blocks_3 = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks_3[i] = create_each_block_3$1(get_each_context_3$1(ctx, each_value_3, i));
    	}

    	const out_2 = i => transition_out(each_blocks_3[i], 1, 1, () => {
    		each_blocks_3[i] = null;
    	});

    	let each_value_2 = /*floor_contacts*/ ctx[4];
    	validate_each_argument(each_value_2);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2$3(get_each_context_2$3(ctx, each_value_2, i));
    	}

    	const out_3 = i => transition_out(each_blocks_2[i], 1, 1, () => {
    		each_blocks_2[i] = null;
    	});

    	let each_value_1 = [1, 2, 3, 4];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < 4; i += 1) {
    		each_blocks_1[i] = create_each_block_1$3(get_each_context_1$3(ctx, each_value_1, i));
    	}

    	const out_4 = i => transition_out(each_blocks_1[i], 1, 1, () => {
    		each_blocks_1[i] = null;
    	});

    	let each_value = [1, 2, 3, 4];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < 4; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	const out_5 = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div7 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			t1 = text(t1_value);
    			t2 = text("\n    floor\n    ");
    			ul0 = element("ul");

    			for (let i = 0; i < each_blocks_5.length; i += 1) {
    				each_blocks_5[i].c();
    			}

    			t3 = space();
    			br0 = element("br");
    			t4 = text("\n    players\n    ");
    			ul1 = element("ul");

    			for (let i = 0; i < each_blocks_4.length; i += 1) {
    				each_blocks_4[i].c();
    			}

    			t5 = space();
    			br1 = element("br");
    			t6 = text("\n    players at net\n    ");
    			ul2 = element("ul");

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].c();
    			}

    			t7 = space();
    			div3 = element("div");
    			span = element("span");
    			span.textContent = "net";
    			t9 = space();
    			div6 = element("div");
    			div4 = element("div");
    			t10 = space();
    			div5 = element("div");
    			t11 = text(t11_value);
    			t12 = text("\n    floor\n    ");
    			ul3 = element("ul");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t13 = space();
    			br2 = element("br");
    			t14 = text("\n    touches\n    ");
    			ul4 = element("ul");

    			for (let i = 0; i < 4; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t15 = space();
    			br3 = element("br");
    			t16 = text("\n    touches at net\n    ");
    			ul5 = element("ul");

    			for (let i = 0; i < 4; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "fill svelte-1ipo16e");
    			add_location(div0, file$8, 129, 4, 3190);
    			attr_dev(div1, "class", "indicator svelte-1ipo16e");
    			toggle_class(div1, "serving", /*serving_team*/ ctx[0] === TEAM.HOME);
    			toggle_class(div1, "receiving", /*receiving_team*/ ctx[1] === TEAM.HOME);
    			add_location(div1, file$8, 130, 4, 3215);
    			attr_dev(ul0, "class", "floor svelte-1ipo16e");
    			add_location(ul0, file$8, 132, 4, 3376);
    			add_location(br0, file$8, 140, 4, 3617);
    			attr_dev(ul1, "class", "players svelte-1ipo16e");
    			add_location(ul1, file$8, 142, 4, 3638);
    			add_location(br1, file$8, 150, 4, 3877);
    			attr_dev(ul2, "class", "players svelte-1ipo16e");
    			add_location(ul2, file$8, 152, 4, 3905);
    			attr_dev(div2, "class", "home svelte-1ipo16e");
    			add_location(div2, file$8, 128, 2, 3167);
    			add_location(span, file$8, 162, 4, 4203);
    			attr_dev(div3, "class", "net svelte-1ipo16e");
    			add_location(div3, file$8, 161, 2, 4157);
    			attr_dev(div4, "class", "fill svelte-1ipo16e");
    			add_location(div4, file$8, 165, 4, 4254);
    			attr_dev(div5, "class", "indicator svelte-1ipo16e");
    			toggle_class(div5, "serving", /*serving_team*/ ctx[0] === TEAM.AWAY);
    			toggle_class(div5, "receiving", /*receiving_team*/ ctx[1] === TEAM.AWAY);
    			add_location(div5, file$8, 166, 4, 4279);
    			attr_dev(ul3, "class", "floor svelte-1ipo16e");
    			add_location(ul3, file$8, 168, 4, 4440);
    			add_location(br2, file$8, 176, 4, 4681);
    			attr_dev(ul4, "class", "touches svelte-1ipo16e");
    			add_location(ul4, file$8, 178, 4, 4702);
    			add_location(br3, file$8, 186, 4, 4928);
    			attr_dev(ul5, "class", "touches svelte-1ipo16e");
    			add_location(ul5, file$8, 188, 4, 4956);
    			attr_dev(div6, "class", "away svelte-1ipo16e");
    			add_location(div6, file$8, 164, 2, 4231);
    			attr_dev(div7, "class", "container svelte-1ipo16e");
    			add_location(div7, file$8, 127, 0, 3141);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div2);
    			append_dev(div2, div0);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, t1);
    			append_dev(div2, t2);
    			append_dev(div2, ul0);

    			for (let i = 0; i < each_blocks_5.length; i += 1) {
    				each_blocks_5[i].m(ul0, null);
    			}

    			append_dev(div2, t3);
    			append_dev(div2, br0);
    			append_dev(div2, t4);
    			append_dev(div2, ul1);

    			for (let i = 0; i < each_blocks_4.length; i += 1) {
    				each_blocks_4[i].m(ul1, null);
    			}

    			append_dev(div2, t5);
    			append_dev(div2, br1);
    			append_dev(div2, t6);
    			append_dev(div2, ul2);

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].m(ul2, null);
    			}

    			append_dev(div7, t7);
    			append_dev(div7, div3);
    			append_dev(div3, span);
    			append_dev(div7, t9);
    			append_dev(div7, div6);
    			append_dev(div6, div4);
    			append_dev(div6, t10);
    			append_dev(div6, div5);
    			append_dev(div5, t11);
    			append_dev(div6, t12);
    			append_dev(div6, ul3);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(ul3, null);
    			}

    			append_dev(div6, t13);
    			append_dev(div6, br2);
    			append_dev(div6, t14);
    			append_dev(div6, ul4);

    			for (let i = 0; i < 4; i += 1) {
    				each_blocks_1[i].m(ul4, null);
    			}

    			append_dev(div6, t15);
    			append_dev(div6, br3);
    			append_dev(div6, t16);
    			append_dev(div6, ul5);

    			for (let i = 0; i < 4; i += 1) {
    				each_blocks[i].m(ul5, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div3, "click", /*click_handler_3*/ ctx[13], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty[0] & /*state_for_team*/ 8) && t1_value !== (t1_value = /*state_for_team*/ ctx[3](TEAM.HOME) + "")) set_data_dev(t1, t1_value);

    			if (dirty[0] & /*serving_team*/ 1) {
    				toggle_class(div1, "serving", /*serving_team*/ ctx[0] === TEAM.HOME);
    			}

    			if (dirty[0] & /*receiving_team*/ 2) {
    				toggle_class(div1, "receiving", /*receiving_team*/ ctx[1] === TEAM.HOME);
    			}

    			if (dirty[0] & /*on_floor, floor_contacts*/ 144) {
    				each_value_5 = /*floor_contacts*/ ctx[4];
    				validate_each_argument(each_value_5);
    				let i;

    				for (i = 0; i < each_value_5.length; i += 1) {
    					const child_ctx = get_each_context_5(ctx, each_value_5, i);

    					if (each_blocks_5[i]) {
    						each_blocks_5[i].p(child_ctx, dirty);
    						transition_in(each_blocks_5[i], 1);
    					} else {
    						each_blocks_5[i] = create_each_block_5(child_ctx);
    						each_blocks_5[i].c();
    						transition_in(each_blocks_5[i], 1);
    						each_blocks_5[i].m(ul0, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_5.length; i < each_blocks_5.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (dirty[0] & /*on_player, home_jerseys*/ 36) {
    				each_value_4 = /*home_jerseys*/ ctx[2];
    				validate_each_argument(each_value_4);
    				let i;

    				for (i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (each_blocks_4[i]) {
    						each_blocks_4[i].p(child_ctx, dirty);
    						transition_in(each_blocks_4[i], 1);
    					} else {
    						each_blocks_4[i] = create_each_block_4(child_ctx);
    						each_blocks_4[i].c();
    						transition_in(each_blocks_4[i], 1);
    						each_blocks_4[i].m(ul1, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_4.length; i < each_blocks_4.length; i += 1) {
    					out_1(i);
    				}

    				check_outros();
    			}

    			if (dirty[0] & /*on_player, home_jerseys*/ 36) {
    				each_value_3 = /*home_jerseys*/ ctx[2];
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3$1(ctx, each_value_3, i);

    					if (each_blocks_3[i]) {
    						each_blocks_3[i].p(child_ctx, dirty);
    						transition_in(each_blocks_3[i], 1);
    					} else {
    						each_blocks_3[i] = create_each_block_3$1(child_ctx);
    						each_blocks_3[i].c();
    						transition_in(each_blocks_3[i], 1);
    						each_blocks_3[i].m(ul2, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_3.length; i < each_blocks_3.length; i += 1) {
    					out_2(i);
    				}

    				check_outros();
    			}

    			if ((!current || dirty[0] & /*state_for_team*/ 8) && t11_value !== (t11_value = /*state_for_team*/ ctx[3](TEAM.AWAY) + "")) set_data_dev(t11, t11_value);

    			if (dirty[0] & /*serving_team*/ 1) {
    				toggle_class(div5, "serving", /*serving_team*/ ctx[0] === TEAM.AWAY);
    			}

    			if (dirty[0] & /*receiving_team*/ 2) {
    				toggle_class(div5, "receiving", /*receiving_team*/ ctx[1] === TEAM.AWAY);
    			}

    			if (dirty[0] & /*on_floor, floor_contacts*/ 144) {
    				each_value_2 = /*floor_contacts*/ ctx[4];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2$3(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    						transition_in(each_blocks_2[i], 1);
    					} else {
    						each_blocks_2[i] = create_each_block_2$3(child_ctx);
    						each_blocks_2[i].c();
    						transition_in(each_blocks_2[i], 1);
    						each_blocks_2[i].m(ul3, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_2.length; i < each_blocks_2.length; i += 1) {
    					out_3(i);
    				}

    				check_outros();
    			}

    			if (dirty[0] & /*on_touches*/ 64) {
    				each_value_1 = [1, 2, 3, 4];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < 4; i += 1) {
    					const child_ctx = get_each_context_1$3(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    						transition_in(each_blocks_1[i], 1);
    					} else {
    						each_blocks_1[i] = create_each_block_1$3(child_ctx);
    						each_blocks_1[i].c();
    						transition_in(each_blocks_1[i], 1);
    						each_blocks_1[i].m(ul4, null);
    					}
    				}

    				group_outros();

    				for (i = 4; i < 4; i += 1) {
    					out_4(i);
    				}

    				check_outros();
    			}

    			if (dirty[0] & /*on_touches*/ 64) {
    				each_value = [1, 2, 3, 4];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < 4; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(ul5, null);
    					}
    				}

    				group_outros();

    				for (i = 4; i < 4; i += 1) {
    					out_5(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_5.length; i += 1) {
    				transition_in(each_blocks_5[i]);
    			}

    			for (let i = 0; i < each_value_4.length; i += 1) {
    				transition_in(each_blocks_4[i]);
    			}

    			for (let i = 0; i < each_value_3.length; i += 1) {
    				transition_in(each_blocks_3[i]);
    			}

    			for (let i = 0; i < each_value_2.length; i += 1) {
    				transition_in(each_blocks_2[i]);
    			}

    			for (let i = 0; i < 4; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			for (let i = 0; i < 4; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks_5 = each_blocks_5.filter(Boolean);

    			for (let i = 0; i < each_blocks_5.length; i += 1) {
    				transition_out(each_blocks_5[i]);
    			}

    			each_blocks_4 = each_blocks_4.filter(Boolean);

    			for (let i = 0; i < each_blocks_4.length; i += 1) {
    				transition_out(each_blocks_4[i]);
    			}

    			each_blocks_3 = each_blocks_3.filter(Boolean);

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				transition_out(each_blocks_3[i]);
    			}

    			each_blocks_2 = each_blocks_2.filter(Boolean);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				transition_out(each_blocks_2[i]);
    			}

    			each_blocks_1 = each_blocks_1.filter(Boolean);

    			for (let i = 0; i < 4; i += 1) {
    				transition_out(each_blocks_1[i]);
    			}

    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < 4; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div7);
    			destroy_each(each_blocks_5, detaching);
    			destroy_each(each_blocks_4, detaching);
    			destroy_each(each_blocks_3, detaching);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let state_for_team;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("SpeedCourt", slots, []);
    	let { is_serve = false } = $$props;
    	let { serving_team } = $$props;
    	let { receiving_team } = $$props;
    	let { home_jerseys = [] } = $$props;
    	const log = logger("speed court: ");
    	const floor_contacts = ["in", "out"];
    	const dispatch = createEventDispatcher();

    	const emit_contact = (area_id, type, player = null) => {
    		const contact = { is_speedy: true, area_id, type };

    		if (player) {
    			contact.player = player;
    		}

    		dispatch("contact", contact);
    	};

    	const on_player = (p, at_net = false) => {
    		log.debug(`player #${p} contact on home court${at_net ? " at net" : ""}`);

    		const area_id = is_serve
    		? "free-home-service"
    		: at_net ? "block-home" : "court-home";

    		emit_contact(area_id, CONTACT.PLAYER, p);
    	};

    	const on_touches = (t, at_net = false) => {
    		log.debug(`${t} touches on away court${at_net ? " at net" : ""}`);

    		if (t === 1 && is_serve) {
    			emit_contact("free-away-service", CONTACT.PLAYER, "Player");
    		} else {
    			const area_id = at_net ? "block-away" : "court-away";

    			for (let i = 0; i < t; i++) {
    				emit_contact(area_id, CONTACT.PLAYER, "Player");
    			}
    		}
    	};

    	const on_floor = (team, type) => {
    		log.debug(`floor contact (${type}) on ${team} side`);
    		const area_id = type === "out" ? `free-${team}` : `court-${team}`;
    		emit_contact(area_id, CONTACT.FLOOR);
    	};

    	const on_net = () => {
    		log.debug(`net contact`);
    		emit_contact("net-area", CONTACT.NET);
    	};

    	const writable_props = ["is_serve", "serving_team", "receiving_team", "home_jerseys"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<SpeedCourt> was created with unknown prop '${key}'`);
    	});

    	const click_handler = f => on_floor(TEAM.HOME, f);
    	const click_handler_1 = j => on_player(j);
    	const click_handler_2 = j => on_player(j, true);
    	const click_handler_3 = () => on_net();
    	const click_handler_4 = f => on_floor(TEAM.AWAY, f);
    	const click_handler_5 = t => on_touches(t);
    	const click_handler_6 = t => on_touches(t, true);

    	$$self.$$set = $$props => {
    		if ("is_serve" in $$props) $$invalidate(9, is_serve = $$props.is_serve);
    		if ("serving_team" in $$props) $$invalidate(0, serving_team = $$props.serving_team);
    		if ("receiving_team" in $$props) $$invalidate(1, receiving_team = $$props.receiving_team);
    		if ("home_jerseys" in $$props) $$invalidate(2, home_jerseys = $$props.home_jerseys);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		Button: ye,
    		TEAM,
    		CONTACT,
    		logger,
    		is_serve,
    		serving_team,
    		receiving_team,
    		home_jerseys,
    		log,
    		floor_contacts,
    		dispatch,
    		emit_contact,
    		on_player,
    		on_touches,
    		on_floor,
    		on_net,
    		state_for_team
    	});

    	$$self.$inject_state = $$props => {
    		if ("is_serve" in $$props) $$invalidate(9, is_serve = $$props.is_serve);
    		if ("serving_team" in $$props) $$invalidate(0, serving_team = $$props.serving_team);
    		if ("receiving_team" in $$props) $$invalidate(1, receiving_team = $$props.receiving_team);
    		if ("home_jerseys" in $$props) $$invalidate(2, home_jerseys = $$props.home_jerseys);
    		if ("state_for_team" in $$props) $$invalidate(3, state_for_team = $$props.state_for_team);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*serving_team, receiving_team*/ 3) {
    			$$invalidate(3, state_for_team = team => {
    				if (team === serving_team) return "serving";
    				if (team === receiving_team) return "receiving";
    				return "";
    			});
    		}
    	};

    	return [
    		serving_team,
    		receiving_team,
    		home_jerseys,
    		state_for_team,
    		floor_contacts,
    		on_player,
    		on_touches,
    		on_floor,
    		on_net,
    		is_serve,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		click_handler_5,
    		click_handler_6
    	];
    }

    class SpeedCourt extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$8,
    			create_fragment$8,
    			safe_not_equal,
    			{
    				is_serve: 9,
    				serving_team: 0,
    				receiving_team: 1,
    				home_jerseys: 2
    			},
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SpeedCourt",
    			options,
    			id: create_fragment$8.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*serving_team*/ ctx[0] === undefined && !("serving_team" in props)) {
    			console.warn("<SpeedCourt> was created without expected prop 'serving_team'");
    		}

    		if (/*receiving_team*/ ctx[1] === undefined && !("receiving_team" in props)) {
    			console.warn("<SpeedCourt> was created without expected prop 'receiving_team'");
    		}
    	}

    	get is_serve() {
    		throw new Error("<SpeedCourt>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set is_serve(value) {
    		throw new Error("<SpeedCourt>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get serving_team() {
    		throw new Error("<SpeedCourt>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set serving_team(value) {
    		throw new Error("<SpeedCourt>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get receiving_team() {
    		throw new Error("<SpeedCourt>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set receiving_team(value) {
    		throw new Error("<SpeedCourt>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get home_jerseys() {
    		throw new Error("<SpeedCourt>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set home_jerseys(value) {
    		throw new Error("<SpeedCourt>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Transcript.svelte generated by Svelte v3.37.0 */
    const file$7 = "src/Transcript.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i];
    	return child_ctx;
    }

    function get_each_context_2$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[17] = list[i];
    	return child_ctx;
    }

    // (154:0) {#if set_n-1 <= set_index && $stored_match.sets[set_n-1]}
    function create_if_block$2(ctx) {
    	let div1;
    	let div0;
    	let div0_class_value;
    	let t0;
    	let button;
    	let t1;
    	let t2;
    	let div1_class_value;
    	let current;

    	function click_handler() {
    		return /*click_handler*/ ctx[9](/*set_n*/ ctx[11]);
    	}

    	button = new ye({
    			props: {
    				outlined: true,
    				dense: true,
    				toggle: true,
    				icon: true,
    				color: "white",
    				title: "Set " + /*set_n*/ ctx[11],
    				$$slots: { default: [create_default_slot_1$4] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button.$on("click", click_handler);
    	let each_value_1 = /*$stored_match*/ ctx[2].sets[/*set_n*/ ctx[11] - 1].rallies;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$2(get_each_context_1$2(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			create_component(button.$$.fragment);
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			attr_dev(div0, "class", div0_class_value = "" + (/*class_for_set*/ ctx[3](/*$stored_match*/ ctx[2].sets[/*set_n*/ ctx[11] - 1]) + " set-bg" + " svelte-1xcm9xy"));
    			add_location(div0, file$7, 155, 2, 3904);
    			attr_dev(div1, "class", div1_class_value = "" + (/*class_for_set*/ ctx[3](/*$stored_match*/ ctx[2].sets[/*set_n*/ ctx[11] - 1]) + " set" + " svelte-1xcm9xy"));
    			add_location(div1, file$7, 154, 0, 3839);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div1, t0);
    			mount_component(button, div1, null);
    			append_dev(div1, t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			append_dev(div1, t2);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (!current || dirty & /*$stored_match*/ 4 && div0_class_value !== (div0_class_value = "" + (/*class_for_set*/ ctx[3](/*$stored_match*/ ctx[2].sets[/*set_n*/ ctx[11] - 1]) + " set-bg" + " svelte-1xcm9xy"))) {
    				attr_dev(div0, "class", div0_class_value);
    			}

    			const button_changes = {};
    			if (dirty & /*$stored_match*/ 4) button_changes.title = "Set " + /*set_n*/ ctx[11];

    			if (dirty & /*$$scope, $stored_match*/ 1048580) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);

    			if (dirty & /*is_collapsed, Array, $stored_match, title_for_contact, color_for_contact, style_for_symbol, symbol_for_action*/ 246) {
    				each_value_1 = /*$stored_match*/ ctx[2].sets[/*set_n*/ ctx[11] - 1].rallies;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$2(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1$2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div1, t2);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (!current || dirty & /*$stored_match*/ 4 && div1_class_value !== (div1_class_value = "" + (/*class_for_set*/ ctx[3](/*$stored_match*/ ctx[2].sets[/*set_n*/ ctx[11] - 1]) + " set" + " svelte-1xcm9xy"))) {
    				attr_dev(div1, "class", div1_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_component(button);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(154:0) {#if set_n-1 <= set_index && $stored_match.sets[set_n-1]}",
    		ctx
    	});

    	return block;
    }

    // (157:2) <Button outlined dense toggle icon color="white" title="Set {set_n}" on:click={()=>on_toggle_set(set_n)}>
    function create_default_slot_1$4(ctx) {
    	let t_value = /*set_n*/ ctx[11] + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$stored_match*/ 4 && t_value !== (t_value = /*set_n*/ ctx[11] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$4.name,
    		type: "slot",
    		source: "(157:2) <Button outlined dense toggle icon color=\\\"white\\\" title=\\\"Set {set_n}\\\" on:click={()=>on_toggle_set(set_n)}>",
    		ctx
    	});

    	return block;
    }

    // (161:4) <Button unelevated dense icon             title="{title_for_contact(c)}"             color="{color_for_contact(c)}"             style="{style_for_symbol(c.action)}">
    function create_default_slot$4(ctx) {
    	let t_value = /*symbol_for_action*/ ctx[6](/*c*/ ctx[17].action) + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$stored_match*/ 4 && t_value !== (t_value = /*symbol_for_action*/ ctx[6](/*c*/ ctx[17].action) + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$4.name,
    		type: "slot",
    		source: "(161:4) <Button unelevated dense icon             title=\\\"{title_for_contact(c)}\\\"             color=\\\"{color_for_contact(c)}\\\"             style=\\\"{style_for_symbol(c.action)}\\\">",
    		ctx
    	});

    	return block;
    }

    // (160:2) {#each rally.contacts as c}
    function create_each_block_2$2(ctx) {
    	let button;
    	let current;

    	button = new ye({
    			props: {
    				unelevated: true,
    				dense: true,
    				icon: true,
    				title: /*title_for_contact*/ ctx[4](/*c*/ ctx[17]),
    				color: /*color_for_contact*/ ctx[5](/*c*/ ctx[17]),
    				style: /*style_for_symbol*/ ctx[7](/*c*/ ctx[17].action),
    				$$slots: { default: [create_default_slot$4] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(button.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const button_changes = {};
    			if (dirty & /*$stored_match*/ 4) button_changes.title = /*title_for_contact*/ ctx[4](/*c*/ ctx[17]);
    			if (dirty & /*$stored_match*/ 4) button_changes.color = /*color_for_contact*/ ctx[5](/*c*/ ctx[17]);
    			if (dirty & /*$stored_match*/ 4) button_changes.style = /*style_for_symbol*/ ctx[7](/*c*/ ctx[17].action);

    			if (dirty & /*$$scope, $stored_match*/ 1048580) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(button, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2$2.name,
    		type: "each",
    		source: "(160:2) {#each rally.contacts as c}",
    		ctx
    	});

    	return block;
    }

    // (158:2) {#each $stored_match.sets[set_n-1].rallies as rally}
    function create_each_block_1$2(ctx) {
    	let span;
    	let current;
    	let each_value_2 = /*rally*/ ctx[14].contacts;
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2$2(get_each_context_2$2(ctx, each_value_2, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			span = element("span");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(span, "class", "rally svelte-1xcm9xy");
    			toggle_class(span, "collapsed", /*is_collapsed*/ ctx[1][/*set_n*/ ctx[11]]);
    			add_location(span, file$7, 158, 2, 4157);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(span, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*title_for_contact, $stored_match, Array, color_for_contact, style_for_symbol, symbol_for_action*/ 244) {
    				each_value_2 = /*rally*/ ctx[14].contacts;
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2$2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_2$2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(span, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_2.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (dirty & /*is_collapsed, Array, $stored_match*/ 6) {
    				toggle_class(span, "collapsed", /*is_collapsed*/ ctx[1][/*set_n*/ ctx[11]]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_2.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$2.name,
    		type: "each",
    		source: "(158:2) {#each $stored_match.sets[set_n-1].rallies as rally}",
    		ctx
    	});

    	return block;
    }

    // (153:0) {#each Array($stored_match.sets.length).fill(0).map((v,i)=>i+1).reverse() as set_n}
    function create_each_block$2(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*set_n*/ ctx[11] - 1 <= /*set_index*/ ctx[0] && /*$stored_match*/ ctx[2].sets[/*set_n*/ ctx[11] - 1] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*set_n*/ ctx[11] - 1 <= /*set_index*/ ctx[0] && /*$stored_match*/ ctx[2].sets[/*set_n*/ ctx[11] - 1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*$stored_match, set_index*/ 5) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(153:0) {#each Array($stored_match.sets.length).fill(0).map((v,i)=>i+1).reverse() as set_n}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = Array(/*$stored_match*/ ctx[2].sets.length).fill(0).map(func).reverse();
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*class_for_set, $stored_match, Array, is_collapsed, title_for_contact, color_for_contact, style_for_symbol, symbol_for_action, on_toggle_set, set_index*/ 511) {
    				each_value = Array(/*$stored_match*/ ctx[2].sets.length).fill(0).map(func).reverse();
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const func = (v, i) => i + 1;

    function instance$7($$self, $$props, $$invalidate) {
    	let $stored_match;
    	validate_store(match, "stored_match");
    	component_subscribe($$self, match, $$value => $$invalidate(2, $stored_match = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Transcript", slots, []);
    	let { set_index = 0 } = $$props;
    	const log = logger("transcript: ");

    	const class_for_set = set => {
    		switch (set.winner) {
    			case "home":
    				return "home";
    			case "away":
    				return "away";
    			default:
    				return "current";
    		}
    	};

    	const title_for_contact = contact => {
    		let t = contact.description;

    		if (contact.player) {
    			t = `${contact.player} ${t}`;
    		}

    		return t;
    	};

    	const color_for_contact = contact => {
    		switch (contact.action) {
    			case ACTION.SERVICE_ERROR:
    			case ACTION.RECEPTION_ERROR:
    			case ACTION.PASSING_ERROR:
    			case ACTION.ATTACKING_ERROR:
    			case ACTION.BLOCKING_ERROR:
    			case ACTION.VIOLATION:
    				return "var(--action-error-rgb)";
    			case ACTION.ACE:
    			case ACTION.BLOCK_KILL:
    			case ACTION.KILL:
    				return "var(--action-point-rgb)";
    			case ACTION.SERVE:
    			case ACTION.DIG_OR_ATTACK:
    			case ACTION.DIG:
    			case ACTION.PASS_OR_ATTACK:
    			case ACTION.PASS:
    			case ACTION.BLOCK_OR_ATTACK:
    			case ACTION.BLOCK:
    			case ACTION.ATTACK:
    				return contact.team === TEAM.HOME
    				? "var(--team-home-rgb)"
    				: "var(--team-away-rgb)";
    			default:
    				return "#555";
    		}
    	};

    	const symbol_for_action = action => {
    		switch (action) {
    			case ACTION.SERVICE_ERROR:
    			case ACTION.RECEPTION_ERROR:
    			case ACTION.PASSING_ERROR:
    			case ACTION.ATTACKING_ERROR:
    			case ACTION.BLOCKING_ERROR:
    				return "E";
    			case ACTION.DIG_OR_ATTACK:
    			case ACTION.PASS_OR_ATTACK:
    			case ACTION.BLOCK_OR_ATTACK:
    				return " ";
    			case ACTION.VIOLATION:
    				return "V";
    			case ACTION.ACE:
    				return "♠";
    			case ACTION.BLOCK:
    				return "B";
    			case ACTION.BLOCK_KILL:
    				return "ꓘ";
    			case ACTION.KILL:
    				return "K";
    			case ACTION.SERVE:
    				return "S";
    			case ACTION.DIG:
    				return "D";
    			case ACTION.PASS:
    				return "P";
    			case ACTION.ATTACK:
    				return "A";
    			default:
    				return "?";
    		} // U+2660 Black Spade Suit (can't use U+FE0E in ::before)
    		// U+A4D8 ꓘ LISU LETTER KHA
    	};

    	const style_for_symbol = action => {
    		switch (action) {
    			case ACTION.ACE:
    				return "font-size: x-large; margin-top: -0.15em; font-family: monospace";
    			default:
    				return "";
    		}
    	};

    	const on_toggle_set = n => {
    		log.debug(`${is_collapsed[n] ? "open" : "collapse"} set ${n}`);
    		$$invalidate(1, is_collapsed[n] = !is_collapsed[n], is_collapsed);
    	};

    	let is_collapsed = {};
    	const writable_props = ["set_index"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Transcript> was created with unknown prop '${key}'`);
    	});

    	const click_handler = set_n => on_toggle_set(set_n);

    	$$self.$$set = $$props => {
    		if ("set_index" in $$props) $$invalidate(0, set_index = $$props.set_index);
    	};

    	$$self.$capture_state = () => ({
    		Button: ye,
    		Icon: je,
    		TEAM,
    		ACTION,
    		stored_match: match,
    		logger,
    		set_index,
    		log,
    		class_for_set,
    		title_for_contact,
    		color_for_contact,
    		symbol_for_action,
    		style_for_symbol,
    		on_toggle_set,
    		is_collapsed,
    		$stored_match
    	});

    	$$self.$inject_state = $$props => {
    		if ("set_index" in $$props) $$invalidate(0, set_index = $$props.set_index);
    		if ("is_collapsed" in $$props) $$invalidate(1, is_collapsed = $$props.is_collapsed);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		set_index,
    		is_collapsed,
    		$stored_match,
    		class_for_set,
    		title_for_contact,
    		color_for_contact,
    		symbol_for_action,
    		style_for_symbol,
    		on_toggle_set,
    		click_handler
    	];
    }

    class Transcript extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { set_index: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Transcript",
    			options,
    			id: create_fragment$7.name
    		});
    	}

    	get set_index() {
    		throw new Error("<Transcript>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set set_index(value) {
    		throw new Error("<Transcript>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Recorder.svelte generated by Svelte v3.37.0 */
    const file$6 = "src/Recorder.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[67] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[70] = list[i];
    	return child_ctx;
    }

    function get_each_context_2$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[73] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[70] = list[i];
    	return child_ctx;
    }

    // (905:4) <Icon>
    function create_default_slot_11(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = Lightning;

    	function switch_props(ctx) {
    		return { $$inline: true };
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (switch_value !== (switch_value = Lightning)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_11.name,
    		type: "slot",
    		source: "(905:4) <Icon>",
    		ctx
    	});

    	return block;
    }

    // (904:2) <Button style="margin: auto;" outlined icon toggle active={speed_mode} on:click={()=>on_speed_toggle()}>
    function create_default_slot_10(ctx) {
    	let icon;
    	let current;

    	icon = new je({
    			props: {
    				$$slots: { default: [create_default_slot_11] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(icon.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const icon_changes = {};

    			if (dirty[2] & /*$$scope*/ 65536) {
    				icon_changes.$$scope = { dirty, ctx };
    			}

    			icon.$set(icon_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_10.name,
    		type: "slot",
    		source: "(904:2) <Button style=\\\"margin: auto;\\\" outlined icon toggle active={speed_mode} on:click={()=>on_speed_toggle()}>",
    		ctx
    	});

    	return block;
    }

    // (926:4) {:else}
    function create_else_block(ctx) {
    	let menu;
    	let current;
    	const menu_spread_levels = [{ origin: /*menu_origin*/ ctx[4] }, /*menu_offset*/ ctx[3]];

    	let menu_props = {
    		$$slots: {
    			activator: [create_activator_slot_1],
    			default: [create_default_slot_7]
    		},
    		$$scope: { ctx }
    	};

    	for (let i = 0; i < menu_spread_levels.length; i += 1) {
    		menu_props = assign(menu_props, menu_spread_levels[i]);
    	}

    	menu = new kn({ props: menu_props, $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(menu.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(menu, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const menu_changes = (dirty[0] & /*menu_origin, menu_offset*/ 24)
    			? get_spread_update(menu_spread_levels, [
    					dirty[0] & /*menu_origin*/ 16 && { origin: /*menu_origin*/ ctx[4] },
    					dirty[0] & /*menu_offset*/ 8 && get_spread_object(/*menu_offset*/ ctx[3])
    				])
    			: {};

    			if (dirty[0] & /*specifiers, current*/ 544 | dirty[2] & /*$$scope*/ 65536) {
    				menu_changes.$$scope = { dirty, ctx };
    			}

    			menu.$set(menu_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(menu.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(menu.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(menu, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(926:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (924:4) {#if speed_mode}
    function create_if_block_1(ctx) {
    	let speedcourt;
    	let current;

    	speedcourt = new SpeedCourt({
    			props: {
    				is_serve: /*current*/ ctx[9].rally && /*current*/ ctx[9].rally.state === /*RALLY_STATE*/ ctx[13].SERVING,
    				serving_team: /*serving_team*/ ctx[16](/*current*/ ctx[9].rally),
    				receiving_team: /*receiving_team*/ ctx[17](/*current*/ ctx[9].rally),
    				home_jerseys: /*jersey_numbers*/ ctx[0]
    			},
    			$$inline: true
    		});

    	speedcourt.$on("contact", /*on_contact*/ ctx[22]);

    	const block = {
    		c: function create() {
    			create_component(speedcourt.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(speedcourt, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const speedcourt_changes = {};
    			if (dirty[0] & /*current*/ 512) speedcourt_changes.is_serve = /*current*/ ctx[9].rally && /*current*/ ctx[9].rally.state === /*RALLY_STATE*/ ctx[13].SERVING;
    			if (dirty[0] & /*current*/ 512) speedcourt_changes.serving_team = /*serving_team*/ ctx[16](/*current*/ ctx[9].rally);
    			if (dirty[0] & /*current*/ 512) speedcourt_changes.receiving_team = /*receiving_team*/ ctx[17](/*current*/ ctx[9].rally);
    			if (dirty[0] & /*jersey_numbers*/ 1) speedcourt_changes.home_jerseys = /*jersey_numbers*/ ctx[0];
    			speedcourt.$set(speedcourt_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(speedcourt.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(speedcourt.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(speedcourt, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(924:4) {#if speed_mode}",
    		ctx
    	});

    	return block;
    }

    // (935:12) <Button fullWidth class="menu-item" on:click={()=>on_specify(s.type, s.value)}>
    function create_default_slot_9(ctx) {
    	let t_value = /*s*/ ctx[70].value + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*current*/ 512 && t_value !== (t_value = /*s*/ ctx[70].value + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_9.name,
    		type: "slot",
    		source: "(935:12) <Button fullWidth class=\\\"menu-item\\\" on:click={()=>on_specify(s.type, s.value)}>",
    		ctx
    	});

    	return block;
    }

    // (934:6) {#each g as s}
    function create_each_block_3(ctx) {
    	let td;
    	let button;
    	let current;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[29](/*s*/ ctx[70]);
    	}

    	button = new ye({
    			props: {
    				fullWidth: true,
    				class: "menu-item",
    				$$slots: { default: [create_default_slot_9] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button.$on("click", click_handler_1);

    	const block = {
    		c: function create() {
    			td = element("td");
    			create_component(button.$$.fragment);
    			add_location(td, file$6, 934, 8, 38282);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			mount_component(button, td, null);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const button_changes = {};

    			if (dirty[0] & /*current*/ 512 | dirty[2] & /*$$scope*/ 65536) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    			destroy_component(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(934:6) {#each g as s}",
    		ctx
    	});

    	return block;
    }

    // (932:6) {#each current.specifiers.groups as g}
    function create_each_block_2$1(ctx) {
    	let tr;
    	let current;
    	let each_value_3 = /*g*/ ctx[73];
    	validate_each_argument(each_value_3);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			tr = element("tr");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(tr, file$6, 932, 6, 38246);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tr, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*on_specify, current*/ 262656) {
    				each_value_3 = /*g*/ ctx[73];
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_3(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(tr, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_3.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_3.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2$1.name,
    		type: "each",
    		source: "(932:6) {#each current.specifiers.groups as g}",
    		ctx
    	});

    	return block;
    }

    // (941:6) <Menuitem on:click={()=>on_specify(s.type, s.value)}>
    function create_default_slot_8(ctx) {
    	let t_value = /*s*/ ctx[70].value + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*specifiers*/ 32 && t_value !== (t_value = /*s*/ ctx[70].value + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_8.name,
    		type: "slot",
    		source: "(941:6) <Menuitem on:click={()=>on_specify(s.type, s.value)}>",
    		ctx
    	});

    	return block;
    }

    // (940:6) {#each specifiers.both as s}
    function create_each_block_1$1(ctx) {
    	let menuitem;
    	let current;

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[30](/*s*/ ctx[70]);
    	}

    	menuitem = new Yn({
    			props: {
    				$$slots: { default: [create_default_slot_8] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	menuitem.$on("click", click_handler_2);

    	const block = {
    		c: function create() {
    			create_component(menuitem.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(menuitem, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const menuitem_changes = {};

    			if (dirty[0] & /*specifiers*/ 32 | dirty[2] & /*$$scope*/ 65536) {
    				menuitem_changes.$$scope = { dirty, ctx };
    			}

    			menuitem.$set(menuitem_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(menuitem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(menuitem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(menuitem, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(940:6) {#each specifiers.both as s}",
    		ctx
    	});

    	return block;
    }

    // (927:4) <Menu origin={menu_origin} {...menu_offset}>
    function create_default_slot_7(ctx) {
    	let t0;
    	let hr;
    	let t1;
    	let each1_anchor;
    	let current;
    	let each_value_2 = /*current*/ ctx[9].specifiers.groups;
    	validate_each_argument(each_value_2);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_1[i] = create_each_block_2$1(get_each_context_2$1(ctx, each_value_2, i));
    	}

    	const out = i => transition_out(each_blocks_1[i], 1, 1, () => {
    		each_blocks_1[i] = null;
    	});

    	let each_value_1 = /*specifiers*/ ctx[5].both;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	const out_1 = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t0 = space();
    			hr = element("hr");
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each1_anchor = empty();
    			add_location(hr, file$6, 938, 6, 38439);
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(target, anchor);
    			}

    			insert_dev(target, t0, anchor);
    			insert_dev(target, hr, anchor);
    			insert_dev(target, t1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*current, on_specify*/ 262656) {
    				each_value_2 = /*current*/ ctx[9].specifiers.groups;
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2$1(ctx, each_value_2, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    						transition_in(each_blocks_1[i], 1);
    					} else {
    						each_blocks_1[i] = create_each_block_2$1(child_ctx);
    						each_blocks_1[i].c();
    						transition_in(each_blocks_1[i], 1);
    						each_blocks_1[i].m(t0.parentNode, t0);
    					}
    				}

    				group_outros();

    				for (i = each_value_2.length; i < each_blocks_1.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (dirty[0] & /*on_specify, specifiers*/ 262176) {
    				each_value_1 = /*specifiers*/ ctx[5].both;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each1_anchor.parentNode, each1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out_1(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_2.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks_1 = each_blocks_1.filter(Boolean);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				transition_out(each_blocks_1[i]);
    			}

    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks_1, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(hr);
    			if (detaching) detach_dev(t1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_7.name,
    		type: "slot",
    		source: "(927:4) <Menu origin={menu_origin} {...menu_offset}>",
    		ctx
    	});

    	return block;
    }

    // (928:6) 
    function create_activator_slot_1(ctx) {
    	let div;
    	let court;
    	let current;
    	court = new Court({ $$inline: true });
    	court.$on("contact", /*on_contact*/ ctx[22]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(court.$$.fragment);
    			attr_dev(div, "slot", "activator");
    			set_style(div, "display", "flex");
    			add_location(div, file$6, 927, 6, 38089);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(court, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(court.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(court.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(court);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_activator_slot_1.name,
    		type: "slot",
    		source: "(928:6) ",
    		ctx
    	});

    	return block;
    }

    // (945:4) {#if serving_team_picker_visible}
    function create_if_block$1(ctx) {
    	let servingteampicker;
    	let current;
    	servingteampicker = new ServingTeamPicker({ $$inline: true });
    	servingteampicker.$on("team_selected", /*on_serving_team_selected*/ ctx[25]);

    	const block = {
    		c: function create() {
    			create_component(servingteampicker.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(servingteampicker, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(servingteampicker.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(servingteampicker.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(servingteampicker, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(945:4) {#if serving_team_picker_visible}",
    		ctx
    	});

    	return block;
    }

    // (952:6) <Icon style="transform: scale(1.25);">
    function create_default_slot_6(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = Jersey;

    	function switch_props(ctx) {
    		return { $$inline: true };
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (switch_value !== (switch_value = Jersey)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_6.name,
    		type: "slot",
    		source: "(952:6) <Icon style=\\\"transform: scale(1.25);\\\">",
    		ctx
    	});

    	return block;
    }

    // (951:4) <Button icon color="var(--team-home-rgb)" style="transform: scale(1.5);" on:click={()=>on_jersey()}>
    function create_default_slot_5(ctx) {
    	let icon;
    	let current;

    	icon = new je({
    			props: {
    				style: "transform: scale(1.25);",
    				$$slots: { default: [create_default_slot_6] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(icon.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const icon_changes = {};

    			if (dirty[2] & /*$$scope*/ 65536) {
    				icon_changes.$$scope = { dirty, ctx };
    			}

    			icon.$set(icon_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_5.name,
    		type: "slot",
    		source: "(951:4) <Button icon color=\\\"var(--team-home-rgb)\\\" style=\\\"transform: scale(1.5);\\\" on:click={()=>on_jersey()}>",
    		ctx
    	});

    	return block;
    }

    // (985:6) <Menuitem on:click={()=>on_whistle(t)}>
    function create_default_slot_4$1(ctx) {
    	let t0;
    	let t1_value = /*t*/ ctx[67] + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			t0 = text("Point for ");
    			t1 = text(t1_value);
    			t2 = text(" team");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, t2, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(t2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_4$1.name,
    		type: "slot",
    		source: "(985:6) <Menuitem on:click={()=>on_whistle(t)}>",
    		ctx
    	});

    	return block;
    }

    // (984:6) {#each [TEAM.HOME, TEAM.AWAY] as t}
    function create_each_block$1(ctx) {
    	let menuitem;
    	let current;

    	function click_handler_4() {
    		return /*click_handler_4*/ ctx[35](/*t*/ ctx[67]);
    	}

    	menuitem = new Yn({
    			props: {
    				$$slots: { default: [create_default_slot_4$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	menuitem.$on("click", click_handler_4);

    	const block = {
    		c: function create() {
    			create_component(menuitem.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(menuitem, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const menuitem_changes = {};

    			if (dirty[2] & /*$$scope*/ 65536) {
    				menuitem_changes.$$scope = { dirty, ctx };
    			}

    			menuitem.$set(menuitem_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(menuitem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(menuitem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(menuitem, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(984:6) {#each [TEAM.HOME, TEAM.AWAY] as t}",
    		ctx
    	});

    	return block;
    }

    // (988:6) <Menuitem>
    function create_default_slot_3$2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Cancel");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3$2.name,
    		type: "slot",
    		source: "(988:6) <Menuitem>",
    		ctx
    	});

    	return block;
    }

    // (977:4) <Menu origin="bottom right" dy={MENU_DY}>
    function create_default_slot_2$2(ctx) {
    	let t0;
    	let hr;
    	let t1;
    	let menuitem;
    	let current;
    	let each_value = [TEAM.HOME, TEAM.AWAY];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < 2; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	menuitem = new Yn({
    			props: {
    				$$slots: { default: [create_default_slot_3$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < 2; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			hr = element("hr");
    			t1 = space();
    			create_component(menuitem.$$.fragment);
    			add_location(hr, file$6, 986, 6, 40146);
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < 2; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, t0, anchor);
    			insert_dev(target, hr, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(menuitem, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*on_whistle*/ 2097152) {
    				each_value = [TEAM.HOME, TEAM.AWAY];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < 2; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(t0.parentNode, t0);
    					}
    				}

    				group_outros();

    				for (i = 2; i < 2; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			const menuitem_changes = {};

    			if (dirty[2] & /*$$scope*/ 65536) {
    				menuitem_changes.$$scope = { dirty, ctx };
    			}

    			menuitem.$set(menuitem_changes);
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < 2; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(menuitem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < 2; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(menuitem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(hr);
    			if (detaching) detach_dev(t1);
    			destroy_component(menuitem, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2$2.name,
    		type: "slot",
    		source: "(977:4) <Menu origin=\\\"bottom right\\\" dy={MENU_DY}>",
    		ctx
    	});

    	return block;
    }

    // (980:10) <Icon style="transform: scale(1.25);">
    function create_default_slot_1$3(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = Whistle;

    	function switch_props(ctx) {
    		return { $$inline: true };
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (switch_value !== (switch_value = Whistle)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$3.name,
    		type: "slot",
    		source: "(980:10) <Icon style=\\\"transform: scale(1.25);\\\">",
    		ctx
    	});

    	return block;
    }

    // (979:8) <Button icon style="margin-left: 1.5rem; margin-right: 0.5rem; float: right; transform: scale(1.5);" color="var(--action-error-rgb)" disabled={!recording}>
    function create_default_slot$3(ctx) {
    	let icon;
    	let current;

    	icon = new je({
    			props: {
    				style: "transform: scale(1.25);",
    				$$slots: { default: [create_default_slot_1$3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(icon.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const icon_changes = {};

    			if (dirty[2] & /*$$scope*/ 65536) {
    				icon_changes.$$scope = { dirty, ctx };
    			}

    			icon.$set(icon_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$3.name,
    		type: "slot",
    		source: "(979:8) <Button icon style=\\\"margin-left: 1.5rem; margin-right: 0.5rem; float: right; transform: scale(1.5);\\\" color=\\\"var(--action-error-rgb)\\\" disabled={!recording}>",
    		ctx
    	});

    	return block;
    }

    // (978:6) 
    function create_activator_slot(ctx) {
    	let div;
    	let button;
    	let current;

    	button = new ye({
    			props: {
    				icon: true,
    				style: "margin-left: 1.5rem; margin-right: 0.5rem; float: right; transform: scale(1.5);",
    				color: "var(--action-error-rgb)",
    				disabled: !/*recording*/ ctx[10],
    				$$slots: { default: [create_default_slot$3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(button.$$.fragment);
    			attr_dev(div, "slot", "activator");
    			add_location(div, file$6, 977, 6, 39690);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(button, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const button_changes = {};
    			if (dirty[0] & /*recording*/ 1024) button_changes.disabled = !/*recording*/ ctx[10];

    			if (dirty[2] & /*$$scope*/ 65536) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_activator_slot.name,
    		type: "slot",
    		source: "(978:6) ",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let div0;
    	let h2;
    	let t1;
    	let button0;
    	let t2;
    	let textfield0;
    	let updating_value;
    	let t3;
    	let datefield;
    	let t4;
    	let div3;
    	let div1;
    	let current_block_type_index;
    	let if_block0;
    	let t5;
    	let div1_resize_listener;
    	let t6;
    	let div2;
    	let button1;
    	let t7;
    	let textfield1;
    	let updating_value_1;
    	let t8;
    	let score;
    	let t9;
    	let textfield2;
    	let updating_value_2;
    	let t10;
    	let menu;
    	let t11;
    	let transcript;
    	let t12;
    	let jerseypicker;
    	let updating_visible;
    	let updating_jerseys;
    	let current;

    	button0 = new ye({
    			props: {
    				style: "margin: auto;",
    				outlined: true,
    				icon: true,
    				toggle: true,
    				active: /*speed_mode*/ ctx[11],
    				$$slots: { default: [create_default_slot_10] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button0.$on("click", /*click_handler*/ ctx[27]);

    	function textfield0_value_binding(value) {
    		/*textfield0_value_binding*/ ctx[28](value);
    	}

    	let textfield0_props = { autocomplete: "off", label: "venue" };

    	if (/*$stored_match*/ ctx[12].venue !== void 0) {
    		textfield0_props.value = /*$stored_match*/ ctx[12].venue;
    	}

    	textfield0 = new Ve({ props: textfield0_props, $$inline: true });
    	binding_callbacks.push(() => bind(textfield0, "value", textfield0_value_binding));
    	textfield0.$on("change", /*on_venue_change*/ ctx[23]);

    	datefield = new en({
    			props: {
    				icon: true,
    				format: date_format,
    				readonly: true,
    				value: /*competition_date*/ ctx[26]
    			},
    			$$inline: true
    		});

    	datefield.$on("date-change", /*on_date_change*/ ctx[24]);
    	const if_block_creators = [create_if_block_1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*speed_mode*/ ctx[11]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	let if_block1 = /*serving_team_picker_visible*/ ctx[8] && create_if_block$1(ctx);

    	button1 = new ye({
    			props: {
    				icon: true,
    				color: "var(--team-home-rgb)",
    				style: "transform: scale(1.5);",
    				$$slots: { default: [create_default_slot_5] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button1.$on("click", /*click_handler_3*/ ctx[32]);

    	function textfield1_value_binding(value) {
    		/*textfield1_value_binding*/ ctx[33](value);
    	}

    	let textfield1_props = {
    		outlined: true,
    		style: "margin: 0; align-self: center;",
    		label: TEAM.HOME
    	};

    	if (/*team_aliases*/ ctx[6][TEAM.HOME] !== void 0) {
    		textfield1_props.value = /*team_aliases*/ ctx[6][TEAM.HOME];
    	}

    	textfield1 = new Ve({ props: textfield1_props, $$inline: true });
    	binding_callbacks.push(() => bind(textfield1, "value", textfield1_value_binding));

    	score = new Score({
    			props: {
    				current_set: /*current*/ ctx[9].set_index + 1,
    				home_score: /*score_for_set*/ ctx[14](/*current*/ ctx[9].match, /*current*/ ctx[9].set_index, TEAM.HOME),
    				home_sets: /*num_set_wins*/ ctx[15](/*current*/ ctx[9].match, TEAM.HOME),
    				away_sets: /*num_set_wins*/ ctx[15](/*current*/ ctx[9].match, TEAM.AWAY),
    				away_score: /*score_for_set*/ ctx[14](/*current*/ ctx[9].match, /*current*/ ctx[9].set_index, TEAM.AWAY)
    			},
    			$$inline: true
    		});

    	function textfield2_value_binding(value) {
    		/*textfield2_value_binding*/ ctx[34](value);
    	}

    	let textfield2_props = {
    		outlined: true,
    		style: "margin: 0 0 0 1.5rem; align-self: center;",
    		label: TEAM.AWAY
    	};

    	if (/*team_aliases*/ ctx[6][TEAM.AWAY] !== void 0) {
    		textfield2_props.value = /*team_aliases*/ ctx[6][TEAM.AWAY];
    	}

    	textfield2 = new Ve({ props: textfield2_props, $$inline: true });
    	binding_callbacks.push(() => bind(textfield2, "value", textfield2_value_binding));

    	menu = new kn({
    			props: {
    				origin: "bottom right",
    				dy: MENU_DY,
    				$$slots: {
    					activator: [create_activator_slot],
    					default: [create_default_slot_2$2]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	transcript = new Transcript({
    			props: { set_index: /*current*/ ctx[9].set_index },
    			$$inline: true
    		});

    	function jerseypicker_visible_binding(value) {
    		/*jerseypicker_visible_binding*/ ctx[36](value);
    	}

    	function jerseypicker_jerseys_binding(value) {
    		/*jerseypicker_jerseys_binding*/ ctx[37](value);
    	}

    	let jerseypicker_props = {};

    	if (/*jersey_picker_visible*/ ctx[7] !== void 0) {
    		jerseypicker_props.visible = /*jersey_picker_visible*/ ctx[7];
    	}

    	if (/*jersey_numbers*/ ctx[0] !== void 0) {
    		jerseypicker_props.jerseys = /*jersey_numbers*/ ctx[0];
    	}

    	jerseypicker = new JerseyPicker({
    			props: jerseypicker_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(jerseypicker, "visible", jerseypicker_visible_binding));
    	binding_callbacks.push(() => bind(jerseypicker, "jerseys", jerseypicker_jerseys_binding));

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "record a match";
    			t1 = space();
    			create_component(button0.$$.fragment);
    			t2 = space();
    			create_component(textfield0.$$.fragment);
    			t3 = space();
    			create_component(datefield.$$.fragment);
    			t4 = space();
    			div3 = element("div");
    			div1 = element("div");
    			if_block0.c();
    			t5 = space();
    			if (if_block1) if_block1.c();
    			t6 = space();
    			div2 = element("div");
    			create_component(button1.$$.fragment);
    			t7 = space();
    			create_component(textfield1.$$.fragment);
    			t8 = space();
    			create_component(score.$$.fragment);
    			t9 = space();
    			create_component(textfield2.$$.fragment);
    			t10 = space();
    			create_component(menu.$$.fragment);
    			t11 = space();
    			create_component(transcript.$$.fragment);
    			t12 = space();
    			create_component(jerseypicker.$$.fragment);
    			attr_dev(h2, "class", "svelte-m2ecub");
    			add_location(h2, file$6, 902, 2, 37185);
    			attr_dev(div0, "class", "title-bar svelte-m2ecub");
    			add_location(div0, file$6, 901, 0, 37158);
    			attr_dev(div1, "class", "widener svelte-m2ecub");
    			add_render_callback(() => /*div1_elementresize_handler*/ ctx[31].call(div1));
    			add_location(div1, file$6, 922, 2, 37677);
    			attr_dev(div2, "class", "control-bar svelte-m2ecub");
    			add_location(div2, file$6, 949, 2, 38738);
    			add_location(div3, file$6, 921, 0, 37668);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, h2);
    			append_dev(div0, t1);
    			mount_component(button0, div0, null);
    			append_dev(div0, t2);
    			mount_component(textfield0, div0, null);
    			append_dev(div0, t3);
    			mount_component(datefield, div0, null);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div1);
    			if_blocks[current_block_type_index].m(div1, null);
    			append_dev(div1, t5);
    			if (if_block1) if_block1.m(div1, null);
    			div1_resize_listener = add_resize_listener(div1, /*div1_elementresize_handler*/ ctx[31].bind(div1));
    			append_dev(div3, t6);
    			append_dev(div3, div2);
    			mount_component(button1, div2, null);
    			append_dev(div2, t7);
    			mount_component(textfield1, div2, null);
    			append_dev(div2, t8);
    			mount_component(score, div2, null);
    			append_dev(div2, t9);
    			mount_component(textfield2, div2, null);
    			append_dev(div2, t10);
    			mount_component(menu, div2, null);
    			insert_dev(target, t11, anchor);
    			mount_component(transcript, target, anchor);
    			insert_dev(target, t12, anchor);
    			mount_component(jerseypicker, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const button0_changes = {};
    			if (dirty[0] & /*speed_mode*/ 2048) button0_changes.active = /*speed_mode*/ ctx[11];

    			if (dirty[2] & /*$$scope*/ 65536) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			const textfield0_changes = {};

    			if (!updating_value && dirty[0] & /*$stored_match*/ 4096) {
    				updating_value = true;
    				textfield0_changes.value = /*$stored_match*/ ctx[12].venue;
    				add_flush_callback(() => updating_value = false);
    			}

    			textfield0.$set(textfield0_changes);
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block0 = if_blocks[current_block_type_index];

    				if (!if_block0) {
    					if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block0.c();
    				} else {
    					if_block0.p(ctx, dirty);
    				}

    				transition_in(if_block0, 1);
    				if_block0.m(div1, t5);
    			}

    			if (/*serving_team_picker_visible*/ ctx[8]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty[0] & /*serving_team_picker_visible*/ 256) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block$1(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div1, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			const button1_changes = {};

    			if (dirty[2] & /*$$scope*/ 65536) {
    				button1_changes.$$scope = { dirty, ctx };
    			}

    			button1.$set(button1_changes);
    			const textfield1_changes = {};

    			if (!updating_value_1 && dirty[0] & /*team_aliases*/ 64) {
    				updating_value_1 = true;
    				textfield1_changes.value = /*team_aliases*/ ctx[6][TEAM.HOME];
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			textfield1.$set(textfield1_changes);
    			const score_changes = {};
    			if (dirty[0] & /*current*/ 512) score_changes.current_set = /*current*/ ctx[9].set_index + 1;
    			if (dirty[0] & /*current*/ 512) score_changes.home_score = /*score_for_set*/ ctx[14](/*current*/ ctx[9].match, /*current*/ ctx[9].set_index, TEAM.HOME);
    			if (dirty[0] & /*current*/ 512) score_changes.home_sets = /*num_set_wins*/ ctx[15](/*current*/ ctx[9].match, TEAM.HOME);
    			if (dirty[0] & /*current*/ 512) score_changes.away_sets = /*num_set_wins*/ ctx[15](/*current*/ ctx[9].match, TEAM.AWAY);
    			if (dirty[0] & /*current*/ 512) score_changes.away_score = /*score_for_set*/ ctx[14](/*current*/ ctx[9].match, /*current*/ ctx[9].set_index, TEAM.AWAY);
    			score.$set(score_changes);
    			const textfield2_changes = {};

    			if (!updating_value_2 && dirty[0] & /*team_aliases*/ 64) {
    				updating_value_2 = true;
    				textfield2_changes.value = /*team_aliases*/ ctx[6][TEAM.AWAY];
    				add_flush_callback(() => updating_value_2 = false);
    			}

    			textfield2.$set(textfield2_changes);
    			const menu_changes = {};

    			if (dirty[0] & /*recording*/ 1024 | dirty[2] & /*$$scope*/ 65536) {
    				menu_changes.$$scope = { dirty, ctx };
    			}

    			menu.$set(menu_changes);
    			const transcript_changes = {};
    			if (dirty[0] & /*current*/ 512) transcript_changes.set_index = /*current*/ ctx[9].set_index;
    			transcript.$set(transcript_changes);
    			const jerseypicker_changes = {};

    			if (!updating_visible && dirty[0] & /*jersey_picker_visible*/ 128) {
    				updating_visible = true;
    				jerseypicker_changes.visible = /*jersey_picker_visible*/ ctx[7];
    				add_flush_callback(() => updating_visible = false);
    			}

    			if (!updating_jerseys && dirty[0] & /*jersey_numbers*/ 1) {
    				updating_jerseys = true;
    				jerseypicker_changes.jerseys = /*jersey_numbers*/ ctx[0];
    				add_flush_callback(() => updating_jerseys = false);
    			}

    			jerseypicker.$set(jerseypicker_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button0.$$.fragment, local);
    			transition_in(textfield0.$$.fragment, local);
    			transition_in(datefield.$$.fragment, local);
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(button1.$$.fragment, local);
    			transition_in(textfield1.$$.fragment, local);
    			transition_in(score.$$.fragment, local);
    			transition_in(textfield2.$$.fragment, local);
    			transition_in(menu.$$.fragment, local);
    			transition_in(transcript.$$.fragment, local);
    			transition_in(jerseypicker.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button0.$$.fragment, local);
    			transition_out(textfield0.$$.fragment, local);
    			transition_out(datefield.$$.fragment, local);
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(button1.$$.fragment, local);
    			transition_out(textfield1.$$.fragment, local);
    			transition_out(score.$$.fragment, local);
    			transition_out(textfield2.$$.fragment, local);
    			transition_out(menu.$$.fragment, local);
    			transition_out(transcript.$$.fragment, local);
    			transition_out(jerseypicker.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			destroy_component(button0);
    			destroy_component(textfield0);
    			destroy_component(datefield);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(div3);
    			if_blocks[current_block_type_index].d();
    			if (if_block1) if_block1.d();
    			div1_resize_listener();
    			destroy_component(button1);
    			destroy_component(textfield1);
    			destroy_component(score);
    			destroy_component(textfield2);
    			destroy_component(menu);
    			if (detaching) detach_dev(t11);
    			destroy_component(transcript, detaching);
    			if (detaching) detach_dev(t12);
    			destroy_component(jerseypicker, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const MENU_DY = 80; // FIXME: magic number.. where is this vertical offset coming from?
    const date_format = "YYYY.MM.DD";

    function instance$6($$self, $$props, $$invalidate) {
    	let $stored_match;
    	validate_store(match, "stored_match");
    	component_subscribe($$self, match, $$value => $$invalidate(12, $stored_match = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Recorder", slots, []);
    	const log = logger("recorder: ");

    	const RALLY_STATE = {
    		SERVING: "serving",
    		SERVE_RECEIVING: "serve_receiving",
    		RECEIVER_RALLYING2: "receiver_rallying2",
    		RECEIVER_RALLYING3: "receiver_rallying3",
    		RECEIVER_ATTACKING: "receiver_attacking",
    		RECEIVER_BLOCKING: "receiver_blocking",
    		SERVER_RALLYING2: "server_rallying2",
    		SERVER_RALLYING3: "server_rallying3",
    		SERVER_ATTACKING: "server_attacking",
    		SERVER_BLOCKING: "server_blocking"
    	};

    	const first = array => array[0];
    	const last = array => array[array.length - 1];

    	const array_into_rows = A => {
    		const root = Math.ceil(Math.sqrt(A.length));
    		let i = 0;
    		let rows = [];

    		for (let c = 0; c < root; c++) {
    			let row = [];

    			for (let r = 0; r < root; r++) {
    				row.push({ type: CONTACT.PLAYER, value: `#${A[i]}` });
    				i++;
    				if (i === A.length) break;
    			}

    			rows.push(row);
    			if (i === A.length) break;
    		}

    		return rows;
    	};

    	const new_rally = serving => ({
    		state: RALLY_STATE.SERVING,
    		serving_team: serving,
    		hits: 0,
    		contacts: []
    	});

    	const new_set = () => {
    		const set = { score: {}, rallies: [], winner: null };
    		set.score[TEAM.HOME] = 0;
    		set.score[TEAM.AWAY] = 0;
    		return set;
    	};

    	const reset_match = (match, num_sets) => {
    		match.sets.splice(0, match.sets.length, ...Array(num_sets).fill(null).map(() => new_set()));
    	};

    	const score_for_set = (match, set_index, team) => match.sets[set_index]
    	? match.sets[set_index].score[team]
    	: 0;

    	const num_set_wins = (match, team) => {
    		return match.sets.reduce((a, v) => a + (v.winner === team ? 1 : 0), 0);
    	};

    	const match_winner_info = (match, set_index, min_wins = 2) => {
    		let has_won = false;
    		let team = null;

    		if (set_index + 1 >= min_wins) {
    			if (num_set_wins(match, TEAM.HOME) >= min_wins) {
    				has_won = true;
    				team = TEAM.HOME;
    			} else if (num_set_wins(match, TEAM.AWAY) >= min_wins) {
    				has_won = true;
    				team = TEAM.AWAY;
    			}
    		}

    		return [has_won, team];
    	};

    	const set_winner_info = (match, set_index, min_wins = 2) => {
    		let has_won = false;
    		let team = null;
    		const h = score_for_set(match, set_index, TEAM.HOME);
    		const a = score_for_set(match, set_index, TEAM.AWAY);
    		const threshold = set_index < min_wins ? 25 : 15;

    		if (Math.max(h, a) >= threshold && Math.abs(h - a) >= 2) {
    			has_won = true;
    			team = h > a ? TEAM.HOME : TEAM.AWAY;
    		}

    		return [has_won, team];
    	};

    	const score_summary = (match, set_index) => {
    		const sets_h = num_set_wins(match, TEAM.HOME);
    		const score_h = score_for_set(match, set_index, TEAM.HOME);
    		const score_a = score_for_set(match, set_index, TEAM.AWAY);
    		const sets_a = num_set_wins(match, TEAM.AWAY);
    		return `score: (${sets_h}) H ${score_h} | ${score_a} A (${sets_a})`;
    	};

    	const point_for = (team, match, set_index) => {
    		match.sets[set_index].score[team] += 1;
    		log.info(score_summary(match, set_index));
    	};

    	const add_new_rally_to_set = (possession, current) => {
    		const { match, set_index } = current;
    		log.info(`starting new rally in set ${set_index + 1}, ${team_aliases[possession]} (${possession}) team serving..`);
    		match.sets[set_index].rallies.push(new_rally(possession));
    		current.rally = last(match.sets[set_index].rallies);
    	};

    	const attribute_action_to_last_player = (rally, contact) => {
    		const latest = last(rally.contacts);
    		contact.player = latest.player;
    		log.debug(`attributed current action (${contact.action}) to ${latest.player}`);
    	};

    	const update_last_recorded_action = (rally, action, description) => {
    		const latest = last(rally.contacts);
    		const old = latest.action;
    		latest.action = action;
    		latest.description = description;
    		log.debug(`resolved last action from: ${old} to ${latest.action} (${latest.description})`);
    	};

    	const needs_specifier = (contact, rally) => {
    		if (contact.is_speedy) {
    			return false;
    		}

    		if (is_net_area(contact.area_id)) {
    			return false;
    		}

    		if (rally.state === RALLY_STATE.SERVING && !is_service_area(contact.area_id, rally.serving_team)) {
    			return false;
    		}

    		return true;
    	};

    	const is_out = area => area.startsWith(`free-`) || area.startsWith(`net-`);
    	const is_net_area = area => area.startsWith("net-");
    	const is_blocking_area = (area, team) => area.startsWith(`block-${team}`);
    	const is_service_area = (area, team) => area.startsWith(`free-${team}-service`);
    	const is_court_area = (area, team) => area.startsWith(`court-${team}`);
    	const is_free_area = (area, team) => area.startsWith(`free-${team}`);
    	const is_play_area = (area, team) => is_court_area(area, team) || is_blocking_area(area, team);
    	const team_from_area = area => area.split("-")[1];
    	const other_team = team => team === TEAM.HOME ? TEAM.AWAY : TEAM.HOME;
    	const serving_team = rally => rally && rally.serving_team ? rally.serving_team : "";

    	const receiving_team = rally => rally && rally.serving_team
    	? other_team(rally.serving_team)
    	: "";

    	const process_contact = current => {
    		const { contact, rally, match: match$1 } = current;
    		log.debug(`ball contact with ${contact.type} in ${contact.area_id}`);
    		let servers = serving_team(rally);
    		let receivers = receiving_team(rally);
    		let possession = servers;
    		let area = contact.area_id;
    		let is_valid = true;
    		let rally_ends = true;

    		const record_action = (msg, action, team) => {
    			log.info(action.toUpperCase(), msg);
    			contact.description = msg;
    			contact.action = action;
    			contact.team = team;
    		};

    		switch (rally.state) {
    			case RALLY_STATE.SERVING:
    				if (contact.type === CONTACT.PLAYER && is_service_area(area, servers)) {
    					record_action(`serve: ${team_aliases[servers]} (${servers}) serving ${team_aliases[receivers]}`, ACTION.SERVE, servers);
    					rally_ends = false;
    					rally.hits = 0;
    					rally.state = RALLY_STATE.SERVE_RECEIVING;
    				} else {
    					is_valid = false;
    					log.warn(`invalid contact: expected ${CONTACT.PLAYER} contact in service area of ${servers} team`);
    				}
    				break;
    			case RALLY_STATE.SERVE_RECEIVING:
    				if (contact.type === CONTACT.PLAYER && is_play_area(area, receivers)) {
    					if (is_blocking_area(area, receivers)) {
    						record_action("reception error: cannot block a serve", ACTION.RECEPTION_ERROR, receivers);
    						rally_ends = true;
    						possession = servers;
    					} else {
    						rally.hits += 1;
    						record_action(`reception: dig or attack (hit ${rally.hits})`, ACTION.DIG_OR_ATTACK, receivers);
    						rally_ends = false;
    						rally.state = RALLY_STATE.RECEIVER_RALLYING2;
    					}

    					break;
    				}
    				if (contact.type === CONTACT.FLOOR && is_play_area(area, receivers)) {
    					record_action("service ace", ACTION.ACE, servers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				if (is_net_area(area)) {
    					record_action("service error: net contact", ACTION.SERVICE_ERROR, servers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				if (is_out(area)) {
    					if (contact.type === CONTACT.PLAYER && is_free_area(area, receivers)) {
    						rally.hits += 1;
    						record_action(`reception: dig or attack [in free area], hit ${rally.hits})`, ACTION.DIG_OR_ATTACK, receivers);
    						rally_ends = false;
    						rally.state = RALLY_STATE.RECEIVER_RALLYING2;
    					} else {
    						record_action("service error: ball landed out of bounds", ACTION.SERVICE_ERROR, servers);
    						attribute_action_to_last_player(rally, contact);
    						rally_ends = true;
    						possession = receivers;
    					}

    					break;
    				}
    				if (is_play_area(area, servers)) {
    					record_action("service error: ball contact on serving team court", ACTION.SERVICE_ERROR, servers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				log.error(`unhandled scenario in rally state ${rally.state}`);
    				break;
    			case RALLY_STATE.RECEIVER_RALLYING2:
    				if (contact.type === CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
    					rally.hits = 1; // ball crossed from receivers to servers, so reset hit count
    					update_last_recorded_action(rally, ACTION.ATTACK, "attack attempt");

    					if (is_blocking_area(area, servers)) {
    						record_action(`block or attack attempt (hit ${rally.hits})`, ACTION.BLOCK_OR_ATTACK, servers);
    						rally.state = RALLY_STATE.SERVER_BLOCKING;
    					} else {
    						record_action(`reception: dig or attack (hit ${rally.hits})`, ACTION.DIG_OR_ATTACK, servers);
    						rally.state = RALLY_STATE.SERVER_RALLYING2;
    					}

    					rally_ends = false;
    					break;
    				}
    				if (contact.type === CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
    					rally.hits += 1;
    					update_last_recorded_action(rally, ACTION.DIG, "reception: dig");
    					record_action(`reception: pass or attack (hit ${rally.hits})`, ACTION.PASS_OR_ATTACK, receivers);
    					rally_ends = false;
    					rally.state = RALLY_STATE.RECEIVER_RALLYING3;
    					break;
    				}
    				if (contact.type === CONTACT.FLOOR && is_play_area(area, servers)) {
    					update_last_recorded_action(rally, ACTION.ATTACK, "attack attempt");
    					record_action("attack kill", ACTION.KILL, receivers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				if (is_net_area(area)) {
    					update_last_recorded_action(rally, ACTION.DIG, "reception: dig");
    					record_action("reception error: net contact", ACTION.RECEPTION_ERROR, receivers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				if (contact.type === CONTACT.FLOOR && is_out(area)) {
    					update_last_recorded_action(rally, ACTION.DIG, "reception: dig");
    					record_action("reception error: ball landed out of bounds", ACTION.RECEPTION_ERROR, receivers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				if (contact.type === CONTACT.FLOOR && is_play_area(area, receivers)) {
    					update_last_recorded_action(rally, ACTION.DIG, "reception: dig");
    					record_action("reception error: ball dropped", ACTION.RECEPTION_ERROR, receivers);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				log.error(`unhandled scenario in rally state ${rally.state}`);
    				break;
    			case RALLY_STATE.RECEIVER_RALLYING3:
    				if (contact.type === CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
    					rally.hits = 1; // ball crossed from receivers to servers, so reset hit count
    					update_last_recorded_action(rally, ACTION.ATTACK, "attack attempt");

    					if (is_blocking_area(area, servers)) {
    						record_action(`block or attack attempt (hit ${rally.hits})`, ACTION.BLOCK_OR_ATTACK, servers);
    						rally_ends = false;
    						rally.state = RALLY_STATE.SERVER_BLOCKING;
    					} else {
    						record_action(`reception: dig or attack (hit ${rally.hits})`, ACTION.DIG_OR_ATTACK, servers);
    						rally_ends = false;
    						rally.state = RALLY_STATE.SERVER_RALLYING2;
    					}

    					break;
    				}
    				if (contact.type === CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
    					rally.hits += 1;
    					update_last_recorded_action(rally, ACTION.PASS, "reception: pass");
    					record_action(`reception: attack (hit ${rally.hits})`, ACTION.ATTACK, receivers);
    					rally_ends = false;
    					rally.state = RALLY_STATE.RECEIVER_ATTACKING;
    					break;
    				}
    				if (contact.type === CONTACT.FLOOR && is_play_area(area, servers)) {
    					update_last_recorded_action(rally, ACTION.ATTACK, "attack attempt");
    					record_action("attack kill", ACTION.KILL, receivers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				if (is_net_area(area)) {
    					update_last_recorded_action(rally, ACTION.PASS, "reception: pass");
    					record_action("passing error: net contact", ACTION.PASSING_ERROR, receivers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				if (contact.type === CONTACT.FLOOR && is_out(area)) {
    					update_last_recorded_action(rally, ACTION.PASS, "reception: pass");
    					record_action("passing error: ball landed out of bounds", ACTION.PASSING_ERROR, receivers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				if (contact.type === CONTACT.FLOOR && is_play_area(area, receivers)) {
    					update_last_recorded_action(rally, ACTION.PASS, "reception: pass");
    					record_action("passing error: ball dropped", ACTION.PASSING_ERROR, receivers);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				log.error(`unhandled scenario in rally state ${rally.state}`);
    				break;
    			case RALLY_STATE.RECEIVER_ATTACKING:
    				if (contact.type === CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
    					rally.hits = 1; // ball crossed from receivers to servers, so reset hit count

    					if (is_blocking_area(area, servers)) {
    						record_action(`block or attack attempt (hit ${rally.hits})`, ACTION.BLOCK_OR_ATTACK, servers);
    						rally_ends = false;
    						rally.state = RALLY_STATE.SERVER_BLOCKING;
    					} else {
    						record_action(`reception: dig or attack (hit ${rally.hits})`, ACTION.DIG_OR_ATTACK, servers);
    						rally_ends = false;
    						rally.state = RALLY_STATE.SERVER_RALLYING2;
    					}

    					break;
    				}
    				if (contact.type === CONTACT.FLOOR && is_play_area(area, servers)) {
    					record_action("attack kill", ACTION.KILL, receivers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				if (is_net_area(area)) {
    					record_action("attacking error: net contact", ACTION.ATTACKING_ERROR, receivers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				if (contact.type === CONTACT.FLOOR && is_out(area)) {
    					record_action("attacking error: ball landed out of bounds", ACTION.ATTACKING_ERROR, receivers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				if (contact.type === CONTACT.FLOOR && is_play_area(area, receivers)) {
    					record_action("attacking error: ball dropped", ACTION.ATTACKING_ERROR, receivers);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				if (contact.type === CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
    					rally.hits += 1;
    					record_action(`attacking error: too many hits (${rally.hits})`, ACTION.ATTACKING_ERROR, receivers);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				break;
    			case RALLY_STATE.RECEIVER_BLOCKING:
    				if (contact.type === CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
    					rally.hits = 1; // ball crossed from receivers to servers, so reset hit count
    					update_last_recorded_action(rally, ACTION.ATTACK, "attack attempt");

    					if (is_blocking_area(area, servers)) {
    						record_action(`block or attack attempt (hit ${rally.hits})`, ACTION.BLOCK_OR_ATTACK, servers);
    						rally_ends = false;
    						rally.state = RALLY_STATE.SERVER_BLOCKING;
    					} else {
    						record_action(`reception: dig or attack (hit ${rally.hits})`, ACTION.DIG_OR_ATTACK, servers);
    						rally_ends = false;
    						rally.state = RALLY_STATE.SERVER_RALLYING2;
    					}

    					break;
    				}
    				if (contact.type === CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
    					rally.hits += 1;
    					update_last_recorded_action(rally, ACTION.PASS, "reception: pass");
    					record_action(`reception: pass or attack (hit ${rally.hits})`, ACTION.PASS_OR_ATTACK, receivers);
    					rally_ends = false;
    					rally.state = RALLY_STATE.RECEIVER_RALLYING3;
    					break;
    				}
    				if (contact.type === CONTACT.FLOOR && is_play_area(area, servers)) {
    					update_last_recorded_action(rally, ACTION.BLOCK, "block attempt");
    					record_action("block kill", ACTION.BLOCK_KILL, receivers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				if (is_net_area(area)) {
    					update_last_recorded_action(rally, ACTION.ATTACK, "attack attempt");
    					record_action("attack error: net contact", ACTION.ATTACKING_ERROR, receivers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				if (contact.type === CONTACT.FLOOR && is_out(area)) {
    					update_last_recorded_action(rally, ACTION.ATTACK, "attack attempt");
    					record_action("attacking error: ball landed out of bounds", ACTION.ATTACKING_ERROR, receivers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				if (contact.type === CONTACT.FLOOR && is_play_area(area, receivers)) {
    					record_action("attacking error: ball dropped", ACTION.ATTACKING_ERROR, receivers);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				break;
    			case RALLY_STATE.SERVER_RALLYING2:
    				if (contact.type === CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
    					rally.hits = 1; // ball crossed from servers to receivers, so reset hit count
    					update_last_recorded_action(rally, ACTION.ATTACK, "attack attempt");

    					if (is_blocking_area(area, receivers)) {
    						record_action(`block or attack attempt (hit ${rally.hits})`, ACTION.BLOCK_OR_ATTACK, receivers);
    						rally.state = RALLY_STATE.RECEIVER_BLOCKING;
    					} else {
    						record_action(`reception: dig or attack (hit ${rally.hits})`, ACTION.DIG_OR_ATTACK, receivers);
    						rally.state = RALLY_STATE.RECEIVER_RALLYING2;
    					}

    					rally_ends = false;
    					break;
    				}
    				if (contact.type === CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
    					rally.hits += 1;
    					update_last_recorded_action(rally, ACTION.DIG, "reception: dig");
    					record_action(`reception: pass or attack (hit ${rally.hits})`, ACTION.PASS_OR_ATTACK, servers);
    					rally_ends = false;
    					rally.state = RALLY_STATE.SERVER_RALLYING3;
    					break;
    				}
    				if (contact.type === CONTACT.FLOOR && is_play_area(area, receivers)) {
    					update_last_recorded_action(rally, ACTION.ATTACK, "attack attempt");
    					record_action("attack kill", ACTION.KILL, servers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				if (is_net_area(area)) {
    					update_last_recorded_action(rally, ACTION.DIG, "reception: dig");
    					record_action("reception error: net contact", ACTION.RECEPTION_ERROR, servers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				if (contact.type === CONTACT.FLOOR && is_out(area)) {
    					update_last_recorded_action(rally, ACTION.DIG, "reception: dig");
    					record_action("reception error: ball landed out of bounds", ACTION.RECEPTION_ERROR, servers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				if (contact.type === CONTACT.FLOOR && is_play_area(area, servers)) {
    					update_last_recorded_action(rally, ACTION.DIG, "reception: dig");
    					record_action("reception error: ball dropped", ACTION.RECEPTION_ERROR, servers);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				log.error(`unhandled scenario in rally state ${rally.state}`);
    				break;
    			case RALLY_STATE.SERVER_RALLYING3:
    				if (contact.type === CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
    					rally.hits = 1; // ball crossed from servers to receivers, so reset hit count
    					update_last_recorded_action(rally, ACTION.ATTACK, "attack attempt");

    					if (is_blocking_area(area, receivers)) {
    						record_action(`block or attack attempt (hit ${rally.hits})`, ACTION.BLOCK_OR_ATTACK, receivers);
    						rally_ends = false;
    						rally.state = RALLY_STATE.RECEIVER_BLOCKING;
    					} else {
    						record_action(`reception: dig or attack (hit ${rally.hits})`, ACTION.DIG_OR_ATTACK, receivers);
    						rally_ends = false;
    						rally.state = RALLY_STATE.RECEIVER_RALLYING2;
    					}

    					break;
    				}
    				if (contact.type === CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
    					rally.hits += 1;
    					update_last_recorded_action(rally, ACTION.PASS, "reception: pass");
    					record_action(`reception: attack (hit ${rally.hits})`, ACTION.ATTACK, servers);
    					rally_ends = false;
    					rally.state = RALLY_STATE.SERVER_ATTACKING;
    					break;
    				}
    				if (contact.type === CONTACT.FLOOR && is_play_area(area, receivers)) {
    					update_last_recorded_action(rally, ACTION.ATTACK, "attack attempt");
    					record_action("attack kill", ACTION.KILL, servers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				if (is_net_area(area)) {
    					update_last_recorded_action(rally, ACTION.PASS, "reception: pass");
    					record_action("passing error: net contact", ACTION.PASSING_ERROR, servers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				if (contact.type === CONTACT.FLOOR && is_out(area)) {
    					update_last_recorded_action(rally, ACTION.PASS, "reception: pass");
    					record_action("passing error: ball landed out of bounds", ACTION.PASSING_ERROR, servers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				if (contact.type === CONTACT.FLOOR && is_play_area(area, servers)) {
    					update_last_recorded_action(rally, ACTION.PASS, "reception: pass");
    					record_action("passing error: ball dropped", ACTION.PASSING_ERROR, servers);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				log.error(`unhandled scenario in rally state ${rally.state}`);
    				break;
    			case RALLY_STATE.SERVER_ATTACKING:
    				if (contact.type === CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
    					rally.hits = 1; // ball crossed from servers to receivers, so reset hit count

    					if (is_blocking_area(area, receivers)) {
    						record_action(`block or attack attempt (hit ${rally.hits})`, ACTION.BLOCK_OR_ATTACK, receivers);
    						rally_ends = false;
    						rally.state = RALLY_STATE.RECEIVER_BLOCKING;
    					} else {
    						record_action(`reception: dig or attack (hit ${rally.hits})`, ACTION.DIG_OR_ATTACK, receivers);
    						rally_ends = false;
    						rally.state = RALLY_STATE.RECEIVER_RALLYING2;
    					}

    					break;
    				}
    				if (contact.type === CONTACT.FLOOR && is_play_area(area, receivers)) {
    					record_action("attack kill", ACTION.KILL, servers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				if (is_net_area(area)) {
    					record_action("attacking error: net contact", ACTION.ATTACKING_ERROR, servers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				if (contact.type === CONTACT.FLOOR && is_out(area)) {
    					record_action("attacking error: ball landed out of bounds", ACTION.ATTACKING_ERROR, servers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				if (contact.type === CONTACT.FLOOR && is_play_area(area, servers)) {
    					record_action("attacking error: ball dropped", ACTION.ATTACKING_ERROR, servers);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				if (contact.type === CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
    					rally.hits += 1;
    					record_action(`attacking error: too many hits (${rally.hits})`, ACTION.ATTACKING_ERROR, servers);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				break;
    			case RALLY_STATE.SERVER_BLOCKING:
    				if (contact.type === CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
    					rally.hits = 1; // ball crossed from servers to receivers, so reset hit count
    					update_last_recorded_action(rally, ACTION.ATTACK, "attack attempt");

    					if (is_blocking_area(area, receivers)) {
    						record_action(`block or attack attempt (hit ${rally.hits})`, ACTION.BLOCK_OR_ATTACK, receivers);
    						rally_ends = false;
    						rally.state = RALLY_STATE.RECEIVER_BLOCKING;
    					} else {
    						record_action(`reception: dig or attack (hit ${rally.hits})`, ACTION.DIG_OR_ATTACK, receivers);
    						rally_ends = false;
    						rally.state = RALLY_STATE.RECEIVER_RALLYING2;
    					}

    					break;
    				}
    				if (contact.type === CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
    					rally.hits += 1;
    					update_last_recorded_action(rally, ACTION.PASS, "reception: pass");
    					record_action(`reception: pass or attack (hit ${rally.hits})`, ACTION.PASS_OR_ATTACK, servers);
    					rally_ends = false;
    					rally.state = RALLY_STATE.SERVER_RALLYING3;
    					break;
    				}
    				if (contact.type === CONTACT.FLOOR && is_play_area(area, receivers)) {
    					update_last_recorded_action(rally, ACTION.BLOCK, "block attempt");
    					record_action("block kill", ACTION.BLOCK_KILL, servers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				if (is_net_area(area)) {
    					update_last_recorded_action(rally, ACTION.ATTACK, "attack attempt");
    					record_action("attack error: net contact", ACTION.ATTACKING_ERROR, servers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				if (contact.type === CONTACT.FLOOR && is_out(area)) {
    					update_last_recorded_action(rally, ACTION.ATTACK, "attack attempt");
    					record_action("attacking error: ball landed out of bounds", ACTION.ATTACKING_ERROR, servers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				if (contact.type === CONTACT.FLOOR && is_play_area(area, servers)) {
    					record_action("attacking error: ball dropped", ACTION.ATTACKING_ERROR, servers);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				break;
    		}

    		if (!contact.action) {
    			log.debug("no action");
    		}

    		if (!is_valid) {
    			return;
    		}

    		rally.contacts.push(contact);
    		let need_new_rally = false;

    		if (rally_ends) {
    			need_new_rally = process_rally_end(current, possession);
    		} else {
    			log.info("rally continues..");
    		}

    		if (need_new_rally) {
    			add_new_rally_to_set(possession, current);
    		}

    		set_store_value(match, $stored_match = match$1, $stored_match); // trigger store update
    	};

    	const process_rally_end = (current, possession) => {
    		const set_index = current.set_index;
    		const match = current.match;
    		let need_new_rally = false;
    		log.info("rally ends.");
    		point_for(possession, match, set_index);
    		log.debug("current:", current);
    		const [set_ends, set_winner] = set_winner_info(match, set_index);

    		if (set_ends) {
    			log.info(`set ${set_index + 1} ends. ${team_aliases[set_winner]} (${set_winner}) team wins.`);
    			match.sets[set_index].winner = set_winner;
    			const [match_ends, match_winner] = match_winner_info(match, set_index);

    			if (match_ends) {
    				log.info(`match ends. ${team_aliases[match_winner]} (${match_winner}) team wins.`);
    				$$invalidate(10, recording = false);
    				$$invalidate(8, serving_team_picker_visible = true);
    			} else {
    				current.set_index = set_index + 1;
    				need_new_rally = true;
    			}
    		} else {
    			need_new_rally = true;
    		}

    		return need_new_rally;
    	};

    	const set_menu_props = ({ el_x: x, el_y: y, el_rect, area_id }) => {
    		// position menu to open near contact and grow towards center of court
    		const { width: w, height: h } = el_rect;

    		const tb = y < h / 2 ? "top" : "bottom";
    		const lr = x < w / 2 ? "left" : "right";
    		$$invalidate(4, menu_origin = `${tb} ${lr}`);
    		$$invalidate(3, menu_offset.dx = lr === "left" ? x : w - x, menu_offset);
    		$$invalidate(3, menu_offset.dy = tb === "top" ? y - MENU_DY : h - y + MENU_DY, menu_offset);

    		// set specifiers appropriate to contact location
    		$$invalidate(9, current.specifiers = specifiers[team_from_area(area_id)], current);
    	};

    	const start_match = (serving, num_sets = 3) => {
    		$$invalidate(10, recording = true);
    		reset_match(current.match, num_sets);
    		$$invalidate(9, current.set_index = 0, current);
    		log.info("starting new match:", current.match);
    		log.info(score_summary(current.match, current.set_index));
    		add_new_rally_to_set(serving, current);
    		$$invalidate(9, current.specifiers = specifiers[serving], current);
    	};

    	const on_specify = (type, value) => {
    		specifying = false;
    		$$invalidate(9, current.contact.type = type, current);

    		if (type === CONTACT.PLAYER) {
    			$$invalidate(9, current.contact.player = value, current);
    		}

    		process_contact(current);
    	};

    	const on_speed_toggle = () => {
    		$$invalidate(11, speed_mode = !speed_mode);
    	};

    	const on_jersey = () => {
    		$$invalidate(7, jersey_picker_visible = true);
    	};

    	const on_whistle = possession => {
    		log.debug(`whistle! point and possession go to: ${possession}`);
    		update_last_recorded_action(current.rally, ACTION.VIOLATION, `violation: point for ${team_aliases[possession]} (${possession})`);
    		const need_new_rally = process_rally_end(current, possession);

    		if (need_new_rally) {
    			add_new_rally_to_set(possession, current);
    		}

    		set_store_value(match, $stored_match = current.match, $stored_match); // trigger store update
    	};

    	const on_contact = e => {
    		/* contact:
       .type
       .player
       .team
       .description
       .action
       .area_id
       .court_x
       .court_y
    */
    		if (!recording) {
    			log.debug("not in recording mode");
    			e.detail.source_event && e.detail.source_event.stopPropagation();
    			return;
    		}

    		if (specifying) {
    			specifying = false;
    			log.debug("specify cancelled");
    			return;
    		}

    		// log.debug(`contact with ${e.detail.area_id} at [${e.detail.el_x}, ${e.detail.el_y}]`);
    		$$invalidate(9, current.contact = e.detail, current);

    		if (needs_specifier(current.contact, current.rally)) {
    			specifying = true;
    			set_menu_props(current.contact);
    		} else {
    			current.contact.source_event && current.contact.source_event.stopPropagation();

    			if (is_net_area(current.contact.area_id)) {
    				$$invalidate(9, current.contact.type = CONTACT.FLOOR, current);
    			}

    			process_contact(current);
    		}

    		delete current.contact.el_rect; // no longer needed after this function
    		delete current.contact.source_event; // no longer needed after this function
    	};

    	const on_venue_change = e => {
    		log.debug("on_venue_change", $stored_match.venue);
    	};

    	const on_date_change = ({ detail }) => {
    		log.debug("on_date_change", detail.toISOString());
    		set_store_value(match, $stored_match.date = detail.toISOString(), $stored_match); // trigger store update
    	};

    	const on_serving_team_selected = ({ detail }) => {
    		log.debug("on_serving_team_selected:", detail.team);
    		$$invalidate(8, serving_team_picker_visible = false);
    		start_match(detail.team);
    	};

    	let competition_date = new Date();
    	let menu_width, menu_height; // read-only
    	let menu_offset = { dx: 0, dy: 0 };
    	let menu_origin = "top left";

    	let specifiers = {
    		"home": { "groups": [] },
    		"away": {
    			"groups": [[{ type: CONTACT.PLAYER, value: "Player" }]]
    		},
    		"both": [{ type: CONTACT.FLOOR, value: "Floor" }]
    	};

    	let team_aliases = { "home": "my team", "away": "their team" };
    	let jersey_numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    	let jersey_picker_visible = false;
    	let serving_team_picker_visible = false;

    	let current = {
    		match: $stored_match,
    		set_index: 0,
    		rally: null,
    		contact: null,
    		specifiers: null
    	};

    	let recording = true;
    	let specifying = false;
    	let speed_mode = false;

    	onMount(async () => {
    		$$invalidate(8, serving_team_picker_visible = true);
    		on_date_change({ detail: competition_date });
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Recorder> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => on_speed_toggle();

    	function textfield0_value_binding(value) {
    		if ($$self.$$.not_equal($stored_match.venue, value)) {
    			$stored_match.venue = value;
    			match.set($stored_match);
    		}
    	}

    	const click_handler_1 = s => on_specify(s.type, s.value);
    	const click_handler_2 = s => on_specify(s.type, s.value);

    	function div1_elementresize_handler() {
    		menu_width = this.clientWidth;
    		menu_height = this.clientHeight;
    		$$invalidate(1, menu_width);
    		$$invalidate(2, menu_height);
    	}

    	const click_handler_3 = () => on_jersey();

    	function textfield1_value_binding(value) {
    		if ($$self.$$.not_equal(team_aliases[TEAM.HOME], value)) {
    			team_aliases[TEAM.HOME] = value;
    			$$invalidate(6, team_aliases);
    		}
    	}

    	function textfield2_value_binding(value) {
    		if ($$self.$$.not_equal(team_aliases[TEAM.AWAY], value)) {
    			team_aliases[TEAM.AWAY] = value;
    			$$invalidate(6, team_aliases);
    		}
    	}

    	const click_handler_4 = t => on_whistle(t);

    	function jerseypicker_visible_binding(value) {
    		jersey_picker_visible = value;
    		$$invalidate(7, jersey_picker_visible);
    	}

    	function jerseypicker_jerseys_binding(value) {
    		jersey_numbers = value;
    		$$invalidate(0, jersey_numbers);
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		Button: ye,
    		Datefield: en,
    		Icon: je,
    		Menu: kn,
    		Menuitem: Yn,
    		Textfield: Ve,
    		TEAM,
    		CONTACT,
    		ACTION,
    		stored_match: match,
    		logger,
    		jersey: Jersey,
    		lightning: Lightning,
    		whistle: Whistle,
    		Court,
    		JerseyPicker,
    		Score,
    		ServingTeamPicker,
    		SpeedCourt,
    		Transcript,
    		log,
    		MENU_DY,
    		RALLY_STATE,
    		first,
    		last,
    		array_into_rows,
    		new_rally,
    		new_set,
    		reset_match,
    		score_for_set,
    		num_set_wins,
    		match_winner_info,
    		set_winner_info,
    		score_summary,
    		point_for,
    		add_new_rally_to_set,
    		attribute_action_to_last_player,
    		update_last_recorded_action,
    		needs_specifier,
    		is_out,
    		is_net_area,
    		is_blocking_area,
    		is_service_area,
    		is_court_area,
    		is_free_area,
    		is_play_area,
    		team_from_area,
    		other_team,
    		serving_team,
    		receiving_team,
    		process_contact,
    		process_rally_end,
    		set_menu_props,
    		start_match,
    		on_specify,
    		on_speed_toggle,
    		on_jersey,
    		on_whistle,
    		on_contact,
    		on_venue_change,
    		on_date_change,
    		on_serving_team_selected,
    		competition_date,
    		date_format,
    		menu_width,
    		menu_height,
    		menu_offset,
    		menu_origin,
    		specifiers,
    		team_aliases,
    		jersey_numbers,
    		jersey_picker_visible,
    		serving_team_picker_visible,
    		current,
    		recording,
    		specifying,
    		speed_mode,
    		$stored_match
    	});

    	$$self.$inject_state = $$props => {
    		if ("competition_date" in $$props) $$invalidate(26, competition_date = $$props.competition_date);
    		if ("menu_width" in $$props) $$invalidate(1, menu_width = $$props.menu_width);
    		if ("menu_height" in $$props) $$invalidate(2, menu_height = $$props.menu_height);
    		if ("menu_offset" in $$props) $$invalidate(3, menu_offset = $$props.menu_offset);
    		if ("menu_origin" in $$props) $$invalidate(4, menu_origin = $$props.menu_origin);
    		if ("specifiers" in $$props) $$invalidate(5, specifiers = $$props.specifiers);
    		if ("team_aliases" in $$props) $$invalidate(6, team_aliases = $$props.team_aliases);
    		if ("jersey_numbers" in $$props) $$invalidate(0, jersey_numbers = $$props.jersey_numbers);
    		if ("jersey_picker_visible" in $$props) $$invalidate(7, jersey_picker_visible = $$props.jersey_picker_visible);
    		if ("serving_team_picker_visible" in $$props) $$invalidate(8, serving_team_picker_visible = $$props.serving_team_picker_visible);
    		if ("current" in $$props) $$invalidate(9, current = $$props.current);
    		if ("recording" in $$props) $$invalidate(10, recording = $$props.recording);
    		if ("specifying" in $$props) specifying = $$props.specifying;
    		if ("speed_mode" in $$props) $$invalidate(11, speed_mode = $$props.speed_mode);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*jersey_numbers*/ 1) {
    			{
    				$$invalidate(5, specifiers["home"]["groups"] = array_into_rows(jersey_numbers), specifiers);
    			}
    		}
    	};

    	return [
    		jersey_numbers,
    		menu_width,
    		menu_height,
    		menu_offset,
    		menu_origin,
    		specifiers,
    		team_aliases,
    		jersey_picker_visible,
    		serving_team_picker_visible,
    		current,
    		recording,
    		speed_mode,
    		$stored_match,
    		RALLY_STATE,
    		score_for_set,
    		num_set_wins,
    		serving_team,
    		receiving_team,
    		on_specify,
    		on_speed_toggle,
    		on_jersey,
    		on_whistle,
    		on_contact,
    		on_venue_change,
    		on_date_change,
    		on_serving_team_selected,
    		competition_date,
    		click_handler,
    		textfield0_value_binding,
    		click_handler_1,
    		click_handler_2,
    		div1_elementresize_handler,
    		click_handler_3,
    		textfield1_value_binding,
    		textfield2_value_binding,
    		click_handler_4,
    		jerseypicker_visible_binding,
    		jerseypicker_jerseys_binding
    	];
    }

    class Recorder extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {}, [-1, -1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Recorder",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    function tidy(items, ...fns) {
      if (typeof items === "function") {
        throw new Error("You must supply the data as the first argument to tidy()");
      }
      let result = items;
      for (const fn of fns) {
        result = fn(result);
      }
      return result;
    }

    function filter(filterFn) {
      const _filter = (items) => items.filter(filterFn);
      return _filter;
    }

    function singleOrArray(d) {
      return d == null ? [] : Array.isArray(d) ? d : [d];
    }

    function ascending(a, b) {
      return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
    }

    // https://github.com/python/cpython/blob/a74eea238f5baba15797e2e8b570d153bc8690a7/Modules/mathmodule.c#L1423
    class Adder {
      constructor() {
        this._partials = new Float64Array(32);
        this._n = 0;
      }
      add(x) {
        const p = this._partials;
        let i = 0;
        for (let j = 0; j < this._n && j < 32; j++) {
          const y = p[j],
            hi = x + y,
            lo = Math.abs(x) < Math.abs(y) ? x - (hi - y) : y - (hi - x);
          if (lo) p[i++] = lo;
          x = hi;
        }
        p[i] = x;
        this._n = i + 1;
        return this;
      }
      valueOf() {
        const p = this._partials;
        let n = this._n, x, y, lo, hi = 0;
        if (n > 0) {
          hi = p[--n];
          while (n > 0) {
            x = hi;
            y = p[--n];
            hi = x + y;
            lo = y - (hi - x);
            if (lo) break;
          }
          if (n > 0 && ((lo < 0 && p[n - 1] < 0) || (lo > 0 && p[n - 1] > 0))) {
            y = lo * 2;
            x = hi + y;
            if (y == x - hi) hi = x;
          }
        }
        return hi;
      }
    }

    function fsum(values, valueof) {
      const adder = new Adder();
      if (valueof === undefined) {
        for (let value of values) {
          if (value = +value) {
            adder.add(value);
          }
        }
      } else {
        let index = -1;
        for (let value of values) {
          if (value = +valueof(value, ++index, values)) {
            adder.add(value);
          }
        }
      }
      return +adder;
    }

    class InternMap extends Map {
      constructor(entries, key = keyof) {
        super();
        Object.defineProperties(this, {_intern: {value: new Map()}, _key: {value: key}});
        if (entries != null) for (const [key, value] of entries) this.set(key, value);
      }
      get(key) {
        return super.get(intern_get(this, key));
      }
      has(key) {
        return super.has(intern_get(this, key));
      }
      set(key, value) {
        return super.set(intern_set(this, key), value);
      }
      delete(key) {
        return super.delete(intern_delete(this, key));
      }
    }

    function intern_get({_intern, _key}, value) {
      const key = _key(value);
      return _intern.has(key) ? _intern.get(key) : value;
    }

    function intern_set({_intern, _key}, value) {
      const key = _key(value);
      if (_intern.has(key)) return _intern.get(key);
      _intern.set(key, value);
      return value;
    }

    function intern_delete({_intern, _key}, value) {
      const key = _key(value);
      if (_intern.has(key)) {
        value = _intern.get(value);
        _intern.delete(key);
      }
      return value;
    }

    function keyof(value) {
      return value !== null && typeof value === "object" ? value.valueOf() : value;
    }

    function identity$1(x) {
      return x;
    }

    function group(values, ...keys) {
      return nest(values, identity$1, identity$1, keys);
    }

    function nest(values, map, reduce, keys) {
      return (function regroup(values, i) {
        if (i >= keys.length) return reduce(values);
        const groups = new InternMap();
        const keyof = keys[i++];
        let index = -1;
        for (const value of values) {
          const key = keyof(value, ++index, values);
          const group = groups.get(key);
          if (group) group.push(value);
          else groups.set(key, [value]);
        }
        for (const [key, values] of groups) {
          groups.set(key, regroup(values, i));
        }
        return map(groups);
      })(values, 0);
    }

    function arrange(comparators) {
      const _arrange = (items) => {
        const comparatorFns = singleOrArray(comparators).map((comp) => typeof comp === "function" ? comp : asc(comp));
        return items.slice().sort((a, b) => {
          for (const comparator of comparatorFns) {
            const result = comparator(a, b);
            if (result)
              return result;
          }
          return 0;
        });
      };
      return _arrange;
    }
    function asc(key) {
      return function _asc(a, b) {
        return emptyAwareComparator(a[key], b[key], false);
      };
    }
    function desc(key) {
      return function _desc(a, b) {
        return emptyAwareComparator(a[key], b[key], true);
      };
    }
    function emptyAwareComparator(aInput, bInput, desc2) {
      let a = desc2 ? bInput : aInput;
      let b = desc2 ? aInput : bInput;
      if (isEmpty(a) && isEmpty(b)) {
        const rankA = a !== a ? 0 : a === null ? 1 : 2;
        const rankB = b !== b ? 0 : b === null ? 1 : 2;
        const order = rankA - rankB;
        return desc2 ? -order : order;
      }
      if (isEmpty(a)) {
        return desc2 ? -1 : 1;
      }
      if (isEmpty(b)) {
        return desc2 ? 1 : -1;
      }
      return ascending(a, b);
    }
    function isEmpty(value) {
      return value == null || value !== value;
    }

    function summarize(summarizeSpec, options) {
      const _summarize = (items) => {
        options = options != null ? options : {};
        const summarized = {};
        const keys = Object.keys(summarizeSpec);
        for (const key of keys) {
          summarized[key] = summarizeSpec[key](items);
        }
        if (options.rest && items.length) {
          const objectKeys = Object.keys(items[0]);
          for (const objKey of objectKeys) {
            if (keys.includes(objKey)) {
              continue;
            }
            summarized[objKey] = options.rest(objKey)(items);
          }
        }
        return [summarized];
      };
      return _summarize;
    }

    function mutate(mutateSpec) {
      const _mutate = (items) => {
        const mutatedItems = [];
        for (const item of items) {
          const mutatedItem = {...item};
          for (const key in mutateSpec) {
            const mutateSpecValue = mutateSpec[key];
            const mutatedResult = typeof mutateSpecValue === "function" ? mutateSpecValue(mutatedItem) : mutateSpecValue;
            mutatedItem[key] = mutatedResult;
          }
          mutatedItems.push(mutatedItem);
        }
        return mutatedItems;
      };
      return _mutate;
    }

    function assignGroupKeys(d, keys) {
      return {
        ...d,
        ...keys.reduce((accum, key) => (accum[key[0]] = key[1], accum), {})
      };
    }

    function groupTraversal(grouped, outputGrouped, keys, addSubgroup, addLeaves, level = 0) {
      for (const [key, value] of grouped.entries()) {
        const keysHere = [...keys, key];
        if (value instanceof Map) {
          const subgroup = addSubgroup(outputGrouped, keysHere, level);
          groupTraversal(value, subgroup, keysHere, addSubgroup, addLeaves, level + 1);
        } else {
          addLeaves(outputGrouped, keysHere, value, level);
        }
      }
      return outputGrouped;
    }

    function groupMap(grouped, groupFn, keyFn = (keys) => keys[keys.length - 1]) {
      function addSubgroup(parentGrouped, keys) {
        const subgroup = new Map();
        parentGrouped.set(keyFn(keys), subgroup);
        return subgroup;
      }
      function addLeaves(parentGrouped, keys, values) {
        parentGrouped.set(keyFn(keys), groupFn(values, keys));
      }
      const outputGrouped = new Map();
      groupTraversal(grouped, outputGrouped, [], addSubgroup, addLeaves);
      return outputGrouped;
    }

    const identity = (d) => d;

    function groupBy(groupKeys, fns, options) {
      const _groupBy = (items) => {
        const grouped = makeGrouped(items, groupKeys);
        const results = runFlow(grouped, fns, options == null ? void 0 : options.addGroupKeys);
        if (options == null ? void 0 : options.export) {
          switch (options.export) {
            case "grouped":
              return results;
            case "entries":
              return exportLevels(results, {
                ...options,
                export: "levels",
                levels: ["entries"]
              });
            case "entries-object":
            case "entries-obj":
            case "entriesObject":
              return exportLevels(results, {
                ...options,
                export: "levels",
                levels: ["entries-object"]
              });
            case "object":
              return exportLevels(results, {
                ...options,
                export: "levels",
                levels: ["object"]
              });
            case "map":
              return exportLevels(results, {
                ...options,
                export: "levels",
                levels: ["map"]
              });
            case "keys":
              return exportLevels(results, {
                ...options,
                export: "levels",
                levels: ["keys"]
              });
            case "values":
              return exportLevels(results, {
                ...options,
                export: "levels",
                levels: ["values"]
              });
            case "levels":
              return exportLevels(results, options);
          }
        }
        const ungrouped = ungroup(results, options == null ? void 0 : options.addGroupKeys);
        return ungrouped;
      };
      return _groupBy;
    }
    groupBy.grouped = (options) => ({...options, export: "grouped"});
    groupBy.entries = (options) => ({...options, export: "entries"});
    groupBy.entriesObject = (options) => ({...options, export: "entries-object"});
    groupBy.object = (options) => ({...options, export: "object"});
    groupBy.map = (options) => ({...options, export: "map"});
    groupBy.keys = (options) => ({...options, export: "keys"});
    groupBy.values = (options) => ({...options, export: "values"});
    groupBy.levels = (options) => ({...options, export: "levels"});
    function runFlow(items, fns, addGroupKeys) {
      let result = items;
      if (!(fns == null ? void 0 : fns.length))
        return result;
      for (const fn of fns) {
        result = groupMap(result, (items2, keys) => {
          const context = {groupKeys: keys};
          let leafItemsMapped = fn(items2, context);
          if (addGroupKeys !== false) {
            leafItemsMapped = leafItemsMapped.map((item) => assignGroupKeys(item, keys));
          }
          return leafItemsMapped;
        });
      }
      return result;
    }
    function makeGrouped(items, groupKeys) {
      const groupKeyFns = singleOrArray(groupKeys).map((key, i) => {
        let keyName;
        if (typeof key === "function") {
          keyName = key.name ? key.name : `group_${i}`;
        } else {
          keyName = key.toString();
        }
        const keyFn = typeof key === "function" ? key : (d) => d[key];
        const keyCache = new Map();
        return (d) => {
          const keyValue = keyFn(d);
          if (keyCache.has(keyValue)) {
            return keyCache.get(keyValue);
          }
          const keyWithName = [keyName, keyValue];
          keyCache.set(keyValue, keyWithName);
          return keyWithName;
        };
      });
      const grouped = group(items, ...groupKeyFns);
      return grouped;
    }
    function ungroup(grouped, addGroupKeys) {
      const items = [];
      groupTraversal(grouped, items, [], identity, (root, keys, values) => {
        let valuesToAdd = values;
        if (addGroupKeys !== false) {
          valuesToAdd = values.map((d) => assignGroupKeys(d, keys));
        }
        root.push(...valuesToAdd);
      });
      return items;
    }
    const defaultCompositeKey = (keys) => keys.join("/");
    function processFromGroupsOptions(options) {
      var _a;
      const {
        flat,
        single,
        mapLeaf = identity,
        mapLeaves = identity,
        addGroupKeys
      } = options;
      let compositeKey;
      if (options.flat) {
        compositeKey = (_a = options.compositeKey) != null ? _a : defaultCompositeKey;
      }
      const groupFn = (values, keys) => {
        return single ? mapLeaf(addGroupKeys === false ? values[0] : assignGroupKeys(values[0], keys)) : mapLeaves(values.map((d) => mapLeaf(addGroupKeys === false ? d : assignGroupKeys(d, keys))));
      };
      const keyFn = flat ? (keys) => compositeKey(keys.map((d) => d[1])) : (keys) => keys[keys.length - 1][1];
      return {groupFn, keyFn};
    }
    function exportLevels(grouped, options) {
      const {groupFn, keyFn} = processFromGroupsOptions(options);
      let {mapEntry = identity} = options;
      const {levels = ["entries"]} = options;
      const levelSpecs = [];
      for (const levelOption of levels) {
        switch (levelOption) {
          case "entries":
          case "entries-object":
          case "entries-obj":
          case "entriesObject": {
            const levelMapEntry = (levelOption === "entries-object" || levelOption === "entries-obj" || levelOption === "entriesObject") && options.mapEntry == null ? ([key, values]) => ({key, values}) : mapEntry;
            levelSpecs.push({
              id: "entries",
              createEmptySubgroup: () => [],
              addSubgroup: (parentGrouped, newSubgroup, key, level) => {
                parentGrouped.push(levelMapEntry([key, newSubgroup], level));
              },
              addLeaf: (parentGrouped, key, values, level) => {
                parentGrouped.push(levelMapEntry([key, values], level));
              }
            });
            break;
          }
          case "map":
            levelSpecs.push({
              id: "map",
              createEmptySubgroup: () => new Map(),
              addSubgroup: (parentGrouped, newSubgroup, key) => {
                parentGrouped.set(key, newSubgroup);
              },
              addLeaf: (parentGrouped, key, values) => {
                parentGrouped.set(key, values);
              }
            });
            break;
          case "object":
            levelSpecs.push({
              id: "object",
              createEmptySubgroup: () => ({}),
              addSubgroup: (parentGrouped, newSubgroup, key) => {
                parentGrouped[key] = newSubgroup;
              },
              addLeaf: (parentGrouped, key, values) => {
                parentGrouped[key] = values;
              }
            });
            break;
          case "keys":
            levelSpecs.push({
              id: "keys",
              createEmptySubgroup: () => [],
              addSubgroup: (parentGrouped, newSubgroup, key) => {
                parentGrouped.push([key, newSubgroup]);
              },
              addLeaf: (parentGrouped, key) => {
                parentGrouped.push(key);
              }
            });
            break;
          case "values":
            levelSpecs.push({
              id: "values",
              createEmptySubgroup: () => [],
              addSubgroup: (parentGrouped, newSubgroup) => {
                parentGrouped.push(newSubgroup);
              },
              addLeaf: (parentGrouped, key, values) => {
                parentGrouped.push(values);
              }
            });
            break;
          default: {
            if (typeof levelOption === "object") {
              levelSpecs.push(levelOption);
            }
          }
        }
      }
      const addSubgroup = (parentGrouped, keys, level) => {
        var _a, _b;
        if (options.flat) {
          return parentGrouped;
        }
        const levelSpec = (_a = levelSpecs[level]) != null ? _a : levelSpecs[levelSpecs.length - 1];
        const nextLevelSpec = (_b = levelSpecs[level + 1]) != null ? _b : levelSpec;
        const newSubgroup = nextLevelSpec.createEmptySubgroup();
        levelSpec.addSubgroup(parentGrouped, newSubgroup, keyFn(keys), level);
        return newSubgroup;
      };
      const addLeaf = (parentGrouped, keys, values, level) => {
        var _a;
        const levelSpec = (_a = levelSpecs[level]) != null ? _a : levelSpecs[levelSpecs.length - 1];
        levelSpec.addLeaf(parentGrouped, keyFn(keys), groupFn(values, keys), level);
      };
      const initialOutputObject = levelSpecs[0].createEmptySubgroup();
      return groupTraversal(grouped, initialOutputObject, [], addSubgroup, addLeaf);
    }

    function n() {
      return (items) => items.length;
    }

    function sum(key) {
      const keyFn = typeof key === "function" ? key : (d) => d[key];
      return (items) => fsum(items, keyFn);
    }

    function tally(options) {
      const _tally = (items) => {
        const {name = "n", wt} = options != null ? options : {};
        const summarized = summarize({[name]: wt == null ? n() : sum(wt)})(items);
        return summarized;
      };
      return _tally;
    }

    function count(groupKeys, options) {
      const _count = (items) => {
        options = options != null ? options : {};
        const {name = "n", sort} = options;
        const results = tidy(items, groupBy(groupKeys, [tally(options)]), sort ? arrange(desc(name)) : identity);
        return results;
      };
      return _count;
    }

    function autodetectByMap(itemsA, itemsB) {
      if (itemsA.length === 0 || itemsB.length === 0)
        return {};
      const keysA = Object.keys(itemsA[0]);
      const keysB = Object.keys(itemsB[0]);
      const byMap = {};
      for (const key of keysA) {
        if (keysB.includes(key)) {
          byMap[key] = key;
        }
      }
      return byMap;
    }
    function makeByMap(by) {
      if (Array.isArray(by)) {
        const byMap = {};
        for (const key of by) {
          byMap[key] = key;
        }
        return byMap;
      } else if (typeof by === "object") {
        return by;
      }
      return {[by]: by};
    }
    function isMatch(d, j, byMap) {
      for (const jKey in byMap) {
        const dKey = byMap[jKey];
        if (d[dKey] !== j[jKey]) {
          return false;
        }
      }
      return true;
    }
    function innerJoin(itemsToJoin, options) {
      const _innerJoin = (items) => {
        const byMap = (options == null ? void 0 : options.by) == null ? autodetectByMap(items, itemsToJoin) : makeByMap(options.by);
        const joined = items.flatMap((d) => {
          const matches = itemsToJoin.filter((j) => isMatch(d, j, byMap));
          return matches.map((j) => ({...d, ...j}));
        });
        return joined;
      };
      return _innerJoin;
    }

    function keysFromItems(items) {
      if (items.length < 1)
        return [];
      const keys = Object.keys(items[0]);
      return keys;
    }

    function everything() {
      return (items) => {
        const keys = keysFromItems(items);
        return keys;
      };
    }

    function processSelectors(items, selectKeys) {
      let processedSelectKeys = [];
      for (const keyInput of singleOrArray(selectKeys)) {
        if (typeof keyInput === "function") {
          processedSelectKeys.push(...keyInput(items));
        } else {
          processedSelectKeys.push(keyInput);
        }
      }
      if (processedSelectKeys.length && processedSelectKeys[0][0] === "-") {
        processedSelectKeys = [...everything()(items), ...processedSelectKeys];
      }
      const negationMap = {};
      const keysWithoutNegations = [];
      for (let k = processedSelectKeys.length - 1; k >= 0; k--) {
        const key = processedSelectKeys[k];
        if (key[0] === "-") {
          negationMap[key.substring(1)] = true;
          continue;
        }
        if (negationMap[key]) {
          negationMap[key] = false;
          continue;
        }
        keysWithoutNegations.unshift(key);
      }
      processedSelectKeys = Array.from(new Set(keysWithoutNegations));
      return processedSelectKeys;
    }
    function select(selectKeys) {
      const _select = (items) => {
        let processedSelectKeys = processSelectors(items, selectKeys);
        if (!processedSelectKeys.length)
          return items;
        return items.map((d) => {
          const mapped = {};
          for (const key of processedSelectKeys) {
            mapped[key] = d[key];
          }
          return mapped;
        });
      };
      return _select;
    }

    function transmute(mutateSpec) {
      const _transmute = (items) => {
        const mutated = mutate(mutateSpec)(items);
        const picked = select(Object.keys(mutateSpec))(mutated);
        return picked;
      };
      return _transmute;
    }

    function pivotWider(options) {
      const _pivotWider = (items) => {
        const {
          namesFrom,
          valuesFrom,
          valuesFill,
          valuesFillMap,
          namesSep = "_"
        } = options;
        const namesFromKeys = Array.isArray(namesFrom) ? namesFrom : [namesFrom];
        const valuesFromKeys = Array.isArray(valuesFrom) ? valuesFrom : [valuesFrom];
        const wider = [];
        if (!items.length)
          return wider;
        const idColumns = Object.keys(items[0]).filter((key) => !namesFromKeys.includes(key) && !valuesFromKeys.includes(key));
        const nameValuesMap = {};
        for (const item of items) {
          for (const nameKey of namesFromKeys) {
            if (nameValuesMap[nameKey] == null) {
              nameValuesMap[nameKey] = {};
            }
            nameValuesMap[nameKey][item[nameKey]] = true;
          }
        }
        const nameValuesLists = [];
        for (const nameKey in nameValuesMap) {
          nameValuesLists.push(Object.keys(nameValuesMap[nameKey]));
        }
        const baseWideObj = {};
        const combos = makeCombinations(namesSep, nameValuesLists);
        for (const nameKey of combos) {
          if (valuesFromKeys.length === 1) {
            baseWideObj[nameKey] = valuesFillMap != null ? valuesFillMap[valuesFromKeys[0]] : valuesFill;
            continue;
          }
          for (const valueKey of valuesFromKeys) {
            baseWideObj[`${valueKey}${namesSep}${nameKey}`] = valuesFillMap != null ? valuesFillMap[valueKey] : valuesFill;
          }
        }
        function widenItems(items2) {
          if (!items2.length)
            return [];
          const wide = {...baseWideObj};
          for (const idKey of idColumns) {
            wide[idKey] = items2[0][idKey];
          }
          for (const item of items2) {
            const nameKey = namesFromKeys.map((key) => item[key]).join(namesSep);
            if (valuesFromKeys.length === 1) {
              wide[nameKey] = item[valuesFromKeys[0]];
              continue;
            }
            for (const valueKey of valuesFromKeys) {
              wide[`${valueKey}${namesSep}${nameKey}`] = item[valueKey];
            }
          }
          return [wide];
        }
        if (!idColumns.length) {
          return widenItems(items);
        }
        const finish = tidy(items, groupBy(idColumns, [widenItems]));
        return finish;
      };
      return _pivotWider;
    }
    function makeCombinations(separator = "_", arrays) {
      function combine(accum, prefix, remainingArrays) {
        if (!remainingArrays.length && prefix != null) {
          accum.push(prefix);
          return;
        }
        const array = remainingArrays[0];
        const newRemainingArrays = remainingArrays.slice(1);
        for (const item of array) {
          combine(accum, prefix == null ? item : `${prefix}${separator}${item}`, newRemainingArrays);
        }
      }
      const result = [];
      combine(result, null, arrays);
      return result;
    }

    function replaceNully(replaceSpec) {
      const _replaceNully = (items) => {
        const replacedItems = [];
        for (const d of items) {
          const obj = {...d};
          for (const key in replaceSpec) {
            if (obj[key] == null) {
              obj[key] = replaceSpec[key];
            }
          }
          replacedItems.push(obj);
        }
        return replacedItems;
      };
      return _replaceNully;
    }

    function endsWith(suffix, ignoreCase = true) {
      return (items) => {
        const regex = new RegExp(`${suffix}$`, ignoreCase ? "i" : void 0);
        const keys = keysFromItems(items);
        return keys.filter((d) => regex.test(d));
      };
    }

    /* src/Table.svelte generated by Svelte v3.37.0 */

    const { Object: Object_1$2 } = globals;
    const file$5 = "src/Table.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    // (54:0) {#if data && data[0]}
    function create_if_block(ctx) {
    	let table;
    	let thead;
    	let tr;
    	let t;
    	let tbody;
    	let current;
    	let each_value_2 = Object.keys(/*data*/ ctx[0][0]);
    	validate_each_argument(each_value_2);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_1[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const out = i => transition_out(each_blocks_1[i], 1, 1, () => {
    		each_blocks_1[i] = null;
    	});

    	let each_value = /*data*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			table = element("table");
    			thead = element("thead");
    			tr = element("tr");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(tr, "class", "svelte-11ilpom");
    			add_location(tr, file$5, 56, 4, 1099);
    			attr_dev(thead, "class", "svelte-11ilpom");
    			add_location(thead, file$5, 55, 2, 1087);
    			add_location(tbody, file$5, 62, 2, 1273);
    			attr_dev(table, "class", "svelte-11ilpom");
    			add_location(table, file$5, 54, 0, 1077);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, table, anchor);
    			append_dev(table, thead);
    			append_dev(thead, tr);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(tr, null);
    			}

    			append_dev(table, t);
    			append_dev(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*Object, data, criteria, sort*/ 7) {
    				each_value_2 = Object.keys(/*data*/ ctx[0][0]);
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    						transition_in(each_blocks_1[i], 1);
    					} else {
    						each_blocks_1[i] = create_each_block_2(child_ctx);
    						each_blocks_1[i].c();
    						transition_in(each_blocks_1[i], 1);
    						each_blocks_1[i].m(tr, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_2.length; i < each_blocks_1.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (dirty & /*Object, data*/ 1) {
    				each_value = /*data*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tbody, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_2.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks_1 = each_blocks_1.filter(Boolean);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				transition_out(each_blocks_1[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(table);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(54:0) {#if data && data[0]}",
    		ctx
    	});

    	return block;
    }

    // (58:6) {#each Object.keys(data[0]) as key}
    function create_each_block_2(ctx) {
    	let th;
    	let t0_value = /*key*/ ctx[10] + "";
    	let t0;
    	let t1;
    	let ripple;
    	let current;
    	let mounted;
    	let dispose;
    	ripple = new he({ $$inline: true });

    	const block = {
    		c: function create() {
    			th = element("th");
    			t0 = text(t0_value);
    			t1 = space();
    			create_component(ripple.$$.fragment);
    			attr_dev(th, "class", "svelte-11ilpom");
    			toggle_class(th, "active", /*key*/ ctx[10] === /*criteria*/ ctx[1].key);
    			add_location(th, file$5, 58, 6, 1152);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, th, anchor);
    			append_dev(th, t0);
    			append_dev(th, t1);
    			mount_component(ripple, th, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(
    					th,
    					"click",
    					function () {
    						if (is_function(/*sort*/ ctx[2](/*key*/ ctx[10]))) /*sort*/ ctx[2](/*key*/ ctx[10]).apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if ((!current || dirty & /*data*/ 1) && t0_value !== (t0_value = /*key*/ ctx[10] + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*Object, data, criteria*/ 3) {
    				toggle_class(th, "active", /*key*/ ctx[10] === /*criteria*/ ctx[1].key);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(ripple.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(ripple.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(th);
    			destroy_component(ripple);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(58:6) {#each Object.keys(data[0]) as key}",
    		ctx
    	});

    	return block;
    }

    // (66:6) {#each Object.values(row) as val}
    function create_each_block_1(ctx) {
    	let td;
    	let t_value = /*val*/ ctx[7] + "";
    	let t;

    	const block = {
    		c: function create() {
    			td = element("td");
    			t = text(t_value);
    			attr_dev(td, "class", "svelte-11ilpom");
    			toggle_class(td, "dim", /*val*/ ctx[7] === 0);
    			add_location(td, file$5, 66, 6, 1360);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			append_dev(td, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data*/ 1 && t_value !== (t_value = /*val*/ ctx[7] + "")) set_data_dev(t, t_value);

    			if (dirty & /*Object, data*/ 1) {
    				toggle_class(td, "dim", /*val*/ ctx[7] === 0);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(66:6) {#each Object.values(row) as val}",
    		ctx
    	});

    	return block;
    }

    // (64:4) {#each data as row}
    function create_each_block(ctx) {
    	let tr;
    	let t;
    	let each_value_1 = Object.values(/*row*/ ctx[4]);
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			tr = element("tr");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			add_location(tr, file$5, 64, 4, 1309);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tr, null);
    			}

    			append_dev(tr, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*Object, data*/ 1) {
    				each_value_1 = Object.values(/*row*/ ctx[4]);
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tr, t);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(64:4) {#each data as row}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*data*/ ctx[0] && /*data*/ ctx[0][0] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*data*/ ctx[0] && /*data*/ ctx[0][0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*data*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let sort;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Table", slots, []);
    	let { data } = $$props;
    	let criteria = { key: null, dir: 1 };

    	const comparator = ({ key, dir }) => (a, b) => {
    		if (a[key] < b[key]) return -1 * dir;
    		if (a[key] > b[key]) return 1 * dir;
    		return 0;
    	};

    	onMount(async () => {
    		$$invalidate(1, criteria.key = data && data[0] && Object.keys(data[0])[0] || null, criteria);
    	});

    	const writable_props = ["data"];

    	Object_1$2.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Table> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("data" in $$props) $$invalidate(0, data = $$props.data);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		Ripple: he,
    		data,
    		criteria,
    		comparator,
    		sort
    	});

    	$$self.$inject_state = $$props => {
    		if ("data" in $$props) $$invalidate(0, data = $$props.data);
    		if ("criteria" in $$props) $$invalidate(1, criteria = $$props.criteria);
    		if ("sort" in $$props) $$invalidate(2, sort = $$props.sort);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*criteria, data*/ 3) {
    			$$invalidate(2, sort = key => {
    				if (key === criteria.key) {
    					$$invalidate(1, criteria.dir *= -1, criteria);
    				} else {
    					$$invalidate(1, criteria.key = key, criteria);
    					$$invalidate(1, criteria.dir = 1, criteria);
    				}

    				$$invalidate(0, data = data.sort(comparator(criteria)));
    			});
    		}
    	};

    	return [data, criteria, sort];
    }

    class Table extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { data: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Table",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*data*/ ctx[0] === undefined && !("data" in props)) {
    			console.warn("<Table> was created without expected prop 'data'");
    		}
    	}

    	get data() {
    		throw new Error("<Table>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<Table>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Visualizer.svelte generated by Svelte v3.37.0 */

    const { Object: Object_1$1 } = globals;
    const file$4 = "src/Visualizer.svelte";

    // (75:2) <ExpansionPanel name="contribution" expand dense bind:group on:change={on_panel_change}>
    function create_default_slot_1$2(ctx) {
    	let table;
    	let current;

    	table = new Table({
    			props: { data: /*player_points*/ ctx[2] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(table.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(table, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const table_changes = {};
    			if (dirty & /*player_points*/ 4) table_changes.data = /*player_points*/ ctx[2];
    			table.$set(table_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(table.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(table.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(table, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$2.name,
    		type: "slot",
    		source: "(75:2) <ExpansionPanel name=\\\"contribution\\\" expand dense bind:group on:change={on_panel_change}>",
    		ctx
    	});

    	return block;
    }

    // (79:2) <ExpansionPanel name="actions" dense bind:group on:change={on_panel_change}>
    function create_default_slot$2(ctx) {
    	let table;
    	let current;

    	table = new Table({
    			props: { data: /*player_stats*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(table.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(table, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const table_changes = {};
    			if (dirty & /*player_stats*/ 1) table_changes.data = /*player_stats*/ ctx[0];
    			table.$set(table_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(table.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(table.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(table, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$2.name,
    		type: "slot",
    		source: "(79:2) <ExpansionPanel name=\\\"actions\\\" dense bind:group on:change={on_panel_change}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let h2;
    	let t1;
    	let div;
    	let expansionpanel0;
    	let updating_group;
    	let t2;
    	let expansionpanel1;
    	let updating_group_1;
    	let current;

    	function expansionpanel0_group_binding(value) {
    		/*expansionpanel0_group_binding*/ ctx[10](value);
    	}

    	let expansionpanel0_props = {
    		name: "contribution",
    		expand: true,
    		dense: true,
    		$$slots: { default: [create_default_slot_1$2] },
    		$$scope: { ctx }
    	};

    	if (/*group*/ ctx[1] !== void 0) {
    		expansionpanel0_props.group = /*group*/ ctx[1];
    	}

    	expansionpanel0 = new bn({
    			props: expansionpanel0_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(expansionpanel0, "group", expansionpanel0_group_binding));
    	expansionpanel0.$on("change", /*on_panel_change*/ ctx[3]);

    	function expansionpanel1_group_binding(value) {
    		/*expansionpanel1_group_binding*/ ctx[11](value);
    	}

    	let expansionpanel1_props = {
    		name: "actions",
    		dense: true,
    		$$slots: { default: [create_default_slot$2] },
    		$$scope: { ctx }
    	};

    	if (/*group*/ ctx[1] !== void 0) {
    		expansionpanel1_props.group = /*group*/ ctx[1];
    	}

    	expansionpanel1 = new bn({
    			props: expansionpanel1_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(expansionpanel1, "group", expansionpanel1_group_binding));
    	expansionpanel1.$on("change", /*on_panel_change*/ ctx[3]);

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "visualize stats";
    			t1 = space();
    			div = element("div");
    			create_component(expansionpanel0.$$.fragment);
    			t2 = space();
    			create_component(expansionpanel1.$$.fragment);
    			set_style(h2, "max-width", "40%");
    			add_location(h2, file$4, 71, 0, 2012);
    			attr_dev(div, "class", "container svelte-1o5xhww");
    			add_location(div, file$4, 73, 0, 2061);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div, anchor);
    			mount_component(expansionpanel0, div, null);
    			append_dev(div, t2);
    			mount_component(expansionpanel1, div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const expansionpanel0_changes = {};

    			if (dirty & /*$$scope, player_points*/ 16388) {
    				expansionpanel0_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_group && dirty & /*group*/ 2) {
    				updating_group = true;
    				expansionpanel0_changes.group = /*group*/ ctx[1];
    				add_flush_callback(() => updating_group = false);
    			}

    			expansionpanel0.$set(expansionpanel0_changes);
    			const expansionpanel1_changes = {};

    			if (dirty & /*$$scope, player_stats*/ 16385) {
    				expansionpanel1_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_group_1 && dirty & /*group*/ 2) {
    				updating_group_1 = true;
    				expansionpanel1_changes.group = /*group*/ ctx[1];
    				add_flush_callback(() => updating_group_1 = false);
    			}

    			expansionpanel1.$set(expansionpanel1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(expansionpanel0.$$.fragment, local);
    			transition_in(expansionpanel1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(expansionpanel0.$$.fragment, local);
    			transition_out(expansionpanel1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div);
    			destroy_component(expansionpanel0);
    			destroy_component(expansionpanel1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let combined_rallies;
    	let all_contacts;
    	let action_summary;
    	let player_stats;
    	let points_won;
    	let points_lost;
    	let player_points;
    	let $match;
    	validate_store(match, "match");
    	component_subscribe($$self, match, $$value => $$invalidate(5, $match = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Visualizer", slots, []);
    	const log = logger("visualizer: ");
    	const sum_keys = (row, keys) => keys.reduce((a, v) => Object.keys(row).includes(v) ? a + row[v] : a, 0);

    	const on_panel_change = ({ detail }) => {
    		
    	}; // log.debug(`panel ${detail.name} is ${detail.expanded ? 'open' : 'closed'}`);

    	let group = "";
    	const writable_props = [];

    	Object_1$1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Visualizer> was created with unknown prop '${key}'`);
    	});

    	function expansionpanel0_group_binding(value) {
    		group = value;
    		$$invalidate(1, group);
    	}

    	function expansionpanel1_group_binding(value) {
    		group = value;
    		$$invalidate(1, group);
    	}

    	$$self.$capture_state = () => ({
    		ExpansionPanel: bn,
    		tidy,
    		arrange,
    		count,
    		desc,
    		endsWith,
    		filter,
    		groupBy,
    		innerJoin,
    		mutate,
    		n,
    		pivotWider,
    		replaceNully,
    		select,
    		transmute,
    		ACTION_POINT,
    		ACTION_ERROR,
    		PLAYER_STAT_COLUMNS,
    		TEAM,
    		match,
    		logger,
    		Table,
    		log,
    		sum_keys,
    		on_panel_change,
    		group,
    		combined_rallies,
    		$match,
    		all_contacts,
    		action_summary,
    		player_stats,
    		points_won,
    		points_lost,
    		player_points
    	});

    	$$self.$inject_state = $$props => {
    		if ("group" in $$props) $$invalidate(1, group = $$props.group);
    		if ("combined_rallies" in $$props) $$invalidate(4, combined_rallies = $$props.combined_rallies);
    		if ("all_contacts" in $$props) $$invalidate(6, all_contacts = $$props.all_contacts);
    		if ("action_summary" in $$props) $$invalidate(7, action_summary = $$props.action_summary);
    		if ("player_stats" in $$props) $$invalidate(0, player_stats = $$props.player_stats);
    		if ("points_won" in $$props) $$invalidate(8, points_won = $$props.points_won);
    		if ("points_lost" in $$props) $$invalidate(9, points_lost = $$props.points_lost);
    		if ("player_points" in $$props) $$invalidate(2, player_points = $$props.player_points);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$match*/ 32) {
    			$$invalidate(4, combined_rallies = $match.sets.reduce((a, v) => a.concat(v.rallies), []));
    		}

    		if ($$self.$$.dirty & /*combined_rallies*/ 16) {
    			$$invalidate(6, all_contacts = combined_rallies.reduce((a, v) => a.concat(v.contacts), []));
    		}

    		if ($$self.$$.dirty & /*all_contacts*/ 64) {
    			$$invalidate(7, action_summary = tidy(all_contacts, filter(c => c.team === TEAM.HOME), groupBy("player", [count("action")]), arrange("action")));
    		}

    		if ($$self.$$.dirty & /*action_summary*/ 128) {
    			$$invalidate(0, player_stats = tidy(action_summary, pivotWider({ namesFrom: "action", valuesFrom: "n" }), replaceNully(Object.fromEntries(PLAYER_STAT_COLUMNS.map(v => [v, 0]))), select(PLAYER_STAT_COLUMNS), arrange("player")));
    		}

    		if ($$self.$$.dirty & /*player_stats*/ 1) {
    			$$invalidate(8, points_won = tidy(
    				player_stats,
    				select(["player", ...ACTION_POINT]),
    				transmute({
    					player: d => d.player,
    					"points won": d => sum_keys(d, ACTION_POINT)
    				}),
    				arrange([desc("points won"), "player"])
    			));
    		}

    		if ($$self.$$.dirty & /*player_stats*/ 1) {
    			$$invalidate(9, points_lost = tidy(
    				player_stats,
    				select(["player", ...ACTION_ERROR]),
    				transmute({
    					player: d => d.player,
    					"points lost": d => sum_keys(d, ACTION_ERROR)
    				}),
    				arrange([desc("points lost"), "player"])
    			));
    		}

    		if ($$self.$$.dirty & /*points_won, points_lost*/ 768) {
    			$$invalidate(2, player_points = tidy(
    				points_won,
    				innerJoin(points_lost, { by: "player" }),
    				mutate({
    					"net value": d => d["points won"] - d["points lost"]
    				}),
    				arrange("player")
    			));
    		}
    	};

    	return [
    		player_stats,
    		group,
    		player_points,
    		on_panel_change,
    		combined_rallies,
    		$match,
    		all_contacts,
    		action_summary,
    		points_won,
    		points_lost,
    		expansionpanel0_group_binding,
    		expansionpanel1_group_binding
    	];
    }

    class Visualizer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Visualizer",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/icons/download_for_offline.svg generated by Svelte v3.37.0 */

    const file$3 = "src/icons/download_for_offline.svg";

    function create_fragment$3(ctx) {
    	let svg;
    	let path0;
    	let path1;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			attr_dev(path0, "d", "M0 0h24v24H0V0z");
    			attr_dev(path0, "fill", "none");
    			add_location(path0, file$3, 5, 2, 213);
    			attr_dev(path1, "d", "M12,2C6.49,2,2,6.49,2,12s4.49,10,10,10s10-4.49,10-10S17.51,2,12,2z M11,10V6h2v4h3l-4,4l-4-4H11z M17,17H7v-2h10V17z");
    			add_location(path1, file$3, 6, 2, 255);
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			add_location(svg, file$3, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Download_for_offline", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Download_for_offline> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Download_for_offline extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Download_for_offline",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/icons/upload_file.svg generated by Svelte v3.37.0 */

    const file$2 = "src/icons/upload_file.svg";

    function create_fragment$2(ctx) {
    	let svg;
    	let path0;
    	let path1;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			attr_dev(path0, "d", "M0 0h24v24H0V0z");
    			attr_dev(path0, "fill", "none");
    			add_location(path0, file$2, 5, 2, 195);
    			attr_dev(path1, "d", "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15.01l1.41 1.41L11 14.84V19h2v-4.16l1.59 1.59L16 15.01 12.01 11z");
    			add_location(path1, file$2, 6, 2, 237);
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			add_location(svg, file$2, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Upload_file", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Upload_file> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Upload_file extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Upload_file",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/DataInterface.svelte generated by Svelte v3.37.0 */
    const file$1 = "src/DataInterface.svelte";

    // (85:8) <Icon style="transform: scale(1.5);">
    function create_default_slot_4(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = Download_for_offline;

    	function switch_props(ctx) {
    		return { $$inline: true };
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (switch_value !== (switch_value = Download_for_offline)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_4.name,
    		type: "slot",
    		source: "(85:8) <Icon style=\\\"transform: scale(1.5);\\\">",
    		ctx
    	});

    	return block;
    }

    // (84:6) <Button outlined title="download this match data" on:click={on_download}>
    function create_default_slot_3$1(ctx) {
    	let icon;
    	let current;

    	icon = new je({
    			props: {
    				style: "transform: scale(1.5);",
    				$$slots: { default: [create_default_slot_4] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(icon.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const icon_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				icon_changes.$$scope = { dirty, ctx };
    			}

    			icon.$set(icon_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3$1.name,
    		type: "slot",
    		source: "(84:6) <Button outlined title=\\\"download this match data\\\" on:click={on_download}>",
    		ctx
    	});

    	return block;
    }

    // (88:8) <Icon style="transform: scale(1.5);">
    function create_default_slot_2$1(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = Upload_file;

    	function switch_props(ctx) {
    		return { $$inline: true };
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (switch_value !== (switch_value = Upload_file)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2$1.name,
    		type: "slot",
    		source: "(88:8) <Icon style=\\\"transform: scale(1.5);\\\">",
    		ctx
    	});

    	return block;
    }

    // (87:6) <Button outlined title="upload new match data" on:click={()=>file_input.click()}>
    function create_default_slot_1$1(ctx) {
    	let icon;
    	let t;
    	let input;
    	let current;
    	let mounted;
    	let dispose;

    	icon = new je({
    			props: {
    				style: "transform: scale(1.5);",
    				$$slots: { default: [create_default_slot_2$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(icon.$$.fragment);
    			t = space();
    			input = element("input");
    			set_style(input, "display", "none");
    			attr_dev(input, "type", "file");
    			attr_dev(input, "accept", ".json, .txt");
    			add_location(input, file$1, 88, 8, 2512);
    		},
    		m: function mount(target, anchor) {
    			mount_component(icon, target, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, input, anchor);
    			/*input_binding*/ ctx[5](input);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*on_upload*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			const icon_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				icon_changes.$$scope = { dirty, ctx };
    			}

    			icon.$set(icon_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(icon, detaching);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(input);
    			/*input_binding*/ ctx[5](null);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$1.name,
    		type: "slot",
    		source: "(87:6) <Button outlined title=\\\"upload new match data\\\" on:click={()=>file_input.click()}>",
    		ctx
    	});

    	return block;
    }

    // (83:4) <ButtonGroup color="primary">
    function create_default_slot$1(ctx) {
    	let button0;
    	let t;
    	let button1;
    	let current;

    	button0 = new ye({
    			props: {
    				outlined: true,
    				title: "download this match data",
    				$$slots: { default: [create_default_slot_3$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button0.$on("click", /*on_download*/ ctx[3]);

    	button1 = new ye({
    			props: {
    				outlined: true,
    				title: "upload new match data",
    				$$slots: { default: [create_default_slot_1$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button1.$on("click", /*click_handler*/ ctx[6]);

    	const block = {
    		c: function create() {
    			create_component(button0.$$.fragment);
    			t = space();
    			create_component(button1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(button0, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(button1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const button0_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			const button1_changes = {};

    			if (dirty & /*$$scope, file_input*/ 1025) {
    				button1_changes.$$scope = { dirty, ctx };
    			}

    			button1.$set(button1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button0.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(button0, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(button1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(83:4) <ButtonGroup color=\\\"primary\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let h2;
    	let t1;
    	let div1;
    	let div0;
    	let buttongroup;
    	let t2;
    	let textarea;
    	let current;

    	buttongroup = new $e({
    			props: {
    				color: "primary",
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "import / export";
    			t1 = space();
    			div1 = element("div");
    			div0 = element("div");
    			create_component(buttongroup.$$.fragment);
    			t2 = space();
    			textarea = element("textarea");
    			set_style(h2, "max-width", "40%");
    			add_location(h2, file$1, 78, 0, 2000);
    			attr_dev(div0, "class", "toolbar svelte-vm60pp");
    			add_location(div0, file$1, 81, 2, 2071);
    			attr_dev(textarea, "autocomplete", "off");
    			attr_dev(textarea, "autocorrect", "off");
    			attr_dev(textarea, "autocapitalize", "off");
    			attr_dev(textarea, "spellcheck", "false");
    			textarea.value = /*match_data*/ ctx[1];
    			attr_dev(textarea, "class", "svelte-vm60pp");
    			add_location(textarea, file$1, 93, 2, 2668);
    			attr_dev(div1, "class", "panel svelte-vm60pp");
    			add_location(div1, file$1, 80, 0, 2049);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			mount_component(buttongroup, div0, null);
    			append_dev(div1, t2);
    			append_dev(div1, textarea);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const buttongroup_changes = {};

    			if (dirty & /*$$scope, file_input*/ 1025) {
    				buttongroup_changes.$$scope = { dirty, ctx };
    			}

    			buttongroup.$set(buttongroup_changes);

    			if (!current || dirty & /*match_data*/ 2) {
    				prop_dev(textarea, "value", /*match_data*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(buttongroup.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(buttongroup.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    			destroy_component(buttongroup);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let match_data;
    	let $match;
    	validate_store(match, "match");
    	component_subscribe($$self, match, $$value => $$invalidate(4, $match = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DataInterface", slots, []);
    	const log = logger("data_interface: ");
    	const file_name_from_match = match => "match_data.json";

    	const save_json_file = (name, data) => {
    		const blob = new Blob([data], { type: "text/json" });
    		const link = document.createElement("a");

    		const click_event = new MouseEvent("click",
    		{
    				view: window,
    				bubbles: true,
    				cancelable: true
    			});

    		link.download = name;
    		link.href = window.URL.createObjectURL(blob);
    		link.dataset.downloadurl = ["text/json", link.download, link.href].join(":");
    		link.dispatchEvent(click_event);
    		link.remove();
    	};

    	const on_upload = e => {
    		log.debug("upload requested", e);
    		let file = e.target.files[0];
    		let reader = new FileReader();
    		reader.onload = e => set_store_value(match, $match = JSON.parse(e.target.result), $match);
    		reader.readAsText(file);
    	};

    	const on_download = e => {
    		log.debug("download requested");
    		save_json_file(file_name_from_match(), match_data);
    	};

    	let file_input;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DataInterface> was created with unknown prop '${key}'`);
    	});

    	function input_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			file_input = $$value;
    			$$invalidate(0, file_input);
    		});
    	}

    	const click_handler = () => file_input.click();

    	$$self.$capture_state = () => ({
    		Button: ye,
    		ButtonGroup: $e,
    		Icon: je,
    		match,
    		logger,
    		download_for_offline: Download_for_offline,
    		upload_file: Upload_file,
    		log,
    		file_name_from_match,
    		save_json_file,
    		on_upload,
    		on_download,
    		file_input,
    		$match,
    		match_data
    	});

    	$$self.$inject_state = $$props => {
    		if ("file_input" in $$props) $$invalidate(0, file_input = $$props.file_input);
    		if ("match_data" in $$props) $$invalidate(1, match_data = $$props.match_data);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$match*/ 16) {
    			$$invalidate(1, match_data = JSON.stringify($match, null, 2));
    		}
    	};

    	return [
    		file_input,
    		match_data,
    		on_upload,
    		on_download,
    		$match,
    		input_binding,
    		click_handler
    	];
    }

    class DataInterface extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DataInterface",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.37.0 */

    const { Object: Object_1 } = globals;
    const file = "src/App.svelte";

    // (49:2) <Tab>
    function create_default_slot_3(ctx) {
    	let recorder;
    	let current;
    	recorder = new Recorder({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(recorder.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(recorder, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(recorder.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(recorder.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(recorder, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(49:2) <Tab>",
    		ctx
    	});

    	return block;
    }

    // (50:2) <Tab>
    function create_default_slot_2(ctx) {
    	let visualizer;
    	let current;
    	visualizer = new Visualizer({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(visualizer.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(visualizer, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(visualizer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(visualizer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(visualizer, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(50:2) <Tab>",
    		ctx
    	});

    	return block;
    }

    // (51:2) <Tab>
    function create_default_slot_1(ctx) {
    	let datainterface;
    	let current;
    	datainterface = new DataInterface({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(datainterface.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(datainterface, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(datainterface.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(datainterface.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(datainterface, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(51:2) <Tab>",
    		ctx
    	});

    	return block;
    }

    // (48:0) <Tabs tabNames={['game', 'stats', 'data']}>
    function create_default_slot(ctx) {
    	let tab0;
    	let t0;
    	let tab1;
    	let t1;
    	let tab2;
    	let current;

    	tab0 = new il({
    			props: {
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	tab1 = new il({
    			props: {
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	tab2 = new il({
    			props: {
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(tab0.$$.fragment);
    			t0 = space();
    			create_component(tab1.$$.fragment);
    			t1 = space();
    			create_component(tab2.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(tab0, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(tab1, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(tab2, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const tab0_changes = {};

    			if (dirty & /*$$scope*/ 32) {
    				tab0_changes.$$scope = { dirty, ctx };
    			}

    			tab0.$set(tab0_changes);
    			const tab1_changes = {};

    			if (dirty & /*$$scope*/ 32) {
    				tab1_changes.$$scope = { dirty, ctx };
    			}

    			tab1.$set(tab1_changes);
    			const tab2_changes = {};

    			if (dirty & /*$$scope*/ 32) {
    				tab2_changes.$$scope = { dirty, ctx };
    			}

    			tab2.$set(tab2_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tab0.$$.fragment, local);
    			transition_in(tab1.$$.fragment, local);
    			transition_in(tab2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tab0.$$.fragment, local);
    			transition_out(tab1.$$.fragment, local);
    			transition_out(tab2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tab0, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(tab1, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(tab2, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(48:0) <Tabs tabNames={['game', 'stats', 'data']}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let headerbar;
    	let br0;
    	let br1;
    	let t;
    	let tabs;
    	let current;

    	headerbar = new HeaderBar({
    			props: {
    				title: "vbstats",
    				version: /*version*/ ctx[0]
    			},
    			$$inline: true
    		});

    	tabs = new nl({
    			props: {
    				tabNames: ["game", "stats", "data"],
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(headerbar.$$.fragment);
    			br0 = element("br");
    			br1 = element("br");
    			t = space();
    			create_component(tabs.$$.fragment);
    			add_location(br0, file, 45, 39, 1411);
    			add_location(br1, file, 45, 44, 1416);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(headerbar, target, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, br1, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(tabs, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const headerbar_changes = {};
    			if (dirty & /*version*/ 1) headerbar_changes.version = /*version*/ ctx[0];
    			headerbar.$set(headerbar_changes);
    			const tabs_changes = {};

    			if (dirty & /*$$scope*/ 32) {
    				tabs_changes.$$scope = { dirty, ctx };
    			}

    			tabs.$set(tabs_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(headerbar.$$.fragment, local);
    			transition_in(tabs.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(headerbar.$$.fragment, local);
    			transition_out(tabs.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(headerbar, detaching);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(br1);
    			if (detaching) detach_dev(t);
    			destroy_component(tabs, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let { version } = $$props;
    	const log = logger("app: ");
    	const prefers_dark = () => window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

    	const toggle_theme = palette => {
    		log.info("toggling theme");
    		const d = document.documentElement;

    		if (d.attributes.getNamedItem("style")) {
    			d.removeAttribute("style");
    		} else {
    			Object.keys(palette).map(k => d.style.setProperty(k, palette[k]));
    		}
    	};

    	const dark_theme = {
    		"--bg-color": "#303134",
    		"--color": "#eee",
    		"--alternate": "#aaa",
    		"--primary": "#91c1c7",
    		"--focus-color": "#91c1c77f", // primary at 50% opacity
    		"--accent": "#ebc599",
    		"--bg-popover": "#3f3f3f",
    		"--bg-panel": "#434343",
    		"--bg-app-bar": "#838383",
    		"--border": "#555",
    		"--bg-input-filled": "#ffffff0d", // 05%
    		"--divider": "#ffffff2d", // 18%
    		"--label": "#ffffff7f", // 50%
    		
    	};

    	onMount(async () => {
    		if (prefers_dark()) {
    			toggle_theme(dark_theme);
    		}
    	});

    	const writable_props = ["version"];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("version" in $$props) $$invalidate(0, version = $$props.version);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		Tab: il,
    		Tabs: nl,
    		logger,
    		HeaderBar,
    		Recorder,
    		Visualizer,
    		DataInterface,
    		version,
    		log,
    		prefers_dark,
    		toggle_theme,
    		dark_theme
    	});

    	$$self.$inject_state = $$props => {
    		if ("version" in $$props) $$invalidate(0, version = $$props.version);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [version];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { version: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*version*/ ctx[0] === undefined && !("version" in props)) {
    			console.warn("<App> was created without expected prop 'version'");
    		}
    	}

    	get version() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set version(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
        version: '1.0.3',
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
