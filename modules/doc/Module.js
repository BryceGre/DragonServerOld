/* 
 * Copyright (c) 2014, Bryce
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * Provides tools for the integration of modules.
 * @type Object
 */
Module = new Object();
/**
 * Available: Client,Server
 * Hooks a module into the event specified. Any future occurences of the
 * specified event will call the module's onHook method.
 * @param {string} hook the event to hook into
 * @param {string} [module=this] the module to hook to the event. If left blank,
 * will hook whatever module is currently executing.
 */
Module.addHook = function(hook, module) {}
/**
 * Available: Client,Server
 * Unhooks a module from the even specified. Any future occurences of the
 * specified event will no longer call the module's onHook method.
 * @param {string} hook the event to hook into
 * @param {string} [module=this] the module to hook to the event. If left blank,
 * will hook whatever module is currently executing.
 */
Module.removeHook = function(hook, module) {}

/**
 * Available: Client,Server
 * Executes an event. All modules hooked into the event will have their onHook
 * function called with an empty set of arguments.
 * @param {string} hook the event to execute
 * @param {Object} [args={}] arguments to supply to the modules. If left out or
 * false, will be an empty Object.
 * @param {number} [ret=ADD] the type of value to return. Can be constants ADD,
 * AVG, MAX, or MIN. If left out, will be ADD.
 * @returns {number} the sum/average/maximum/minimum of all return values from
 * onHook methods called by this hook.
 */
Module.doHook = function(hook, args, ret) {}