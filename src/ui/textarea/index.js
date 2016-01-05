/**
 * ui textarea
 * @author ydr.me
 * @create 2015-12-23 17:31
 */


define(function (require, exports, module) {
    /**
     * @module ui/textarea
     * @requires core/dom/selector
     * @requires core/event/hotkey
     * @requires utils/textarea
     * @requires utils/controller
     * @requires utils/dato
     */

    'use strict';

    var ui = require('../index.js');
    var selector = require('../../core/dom/selector.js');
    var attribute = require('../../core/dom/attribute.js');
    var localStorage = require('../../core/navigator/local-storage.js');
    var event = require('../../core/event/hotkey.js');
    var textarea = require('../../utils/textarea.js');
    var controller = require('../../utils/controller.js');
    var dato = require('../../utils/dato.js');

    var namespace = 'alien-ui-textarea';
    var defaults = {
        tabSize: 4,
        historyLength: 99
    };

    var Textarea = ui.create({
        constructor: function ($textarea, options) {
            var the = this;

            the._eTextarea = selector.query($textarea)[0];
            the._options = dato.extend({}, defaults, options);
            the._stack = [];
            the._set(0, 0, the._eTextarea.value);
            the._id = namespace + the._genId(the._eTextarea);
            the._initEvent();
        },


        /**
         * 生成 ID
         * @param $textarea
         * @returns {string}
         * @private
         */
        _genId: function ($textarea) {
            var id = attribute.attr($textarea, 'id');
            var className = attribute.attr($textarea, 'class');
            var name = attribute.attr($textarea, 'name');
            var tagName = $textarea.tagName;
            var parentTagName = selector.parent($textarea)[0].tagName;

            return '-/' + encodeURIComponent(location.href) + '/#' +
                id + '.' + className + '<' + parentTagName + '><' + tagName + '>' + name;
        },


        /**
         * 初始化事件
         * @private
         */
        _initEvent: function () {
            var the = this;

            the.bind('tab', function () {
                the.increaseIndent();
                return false;
            });

            the.bind('shift+tab', function () {
                the.decreaseIndent();
                return false;
            });

            the.bind('cmd+z ctrl+z', function () {
                the._get();
                return false;
            });

            the.bind('cmd+shift+z ctrl+shift+z', function () {
                the._get(true);
                return false;
            });

            the.bind('input', controller.debounce(function () {
                var selection = the.getSelection();

                the._set(selection[0], selection[1], this.value);
            }));

            the.bind('return', function () {
                the.holdIndent();
                return false;
            });
        },


        /**
         * 绑定事件
         * @param eventType
         * @param callback
         * @returns {Textarea}
         */
        bind: function (eventType, callback) {
            var the = this;
            event.on(the._eTextarea, eventType, callback);
            return the;
        },


        /**
         * 返回输入框的值
         * @returns {String}
         */
        getValue: function () {
            return this._eTextarea.value;
        },


        /**
         * 增加缩进
         * @returns {Textarea}
         */
        increaseIndent: function () {
            var the = this;
            var selection = the.getSelection();
            var lines = the.getLines();
            var $textarea = the._eTextarea;
            var value = $textarea.value;
            var options = the._options;
            var tabSize = options.tabSize;
            var tabValue = new Array(options.tabSize + 1).join(' ');

            dato.each(lines, function (index, item) {
                var left = value.slice(0, item.start + index * tabSize);
                var right = value.slice(item.end + index * tabSize);

                value = left + tabValue + item.text + right;
            });

            var start = selection[0] + tabSize;
            var end = selection[1] + tabSize * lines.length;
            the._set(start, end, value);

            return the;
        },


        /**
         * 减少缩进
         * @returns {Textarea}
         */
        decreaseIndent: function () {
            var the = this;
            var selection = the.getSelection();
            var lines = the.getLines();
            var $textarea = the._eTextarea;
            var value = $textarea.value;
            var options = the._options;
            var tabSize = options.tabSize;
            var tabLineLength = 0;
            var isTabFirstLine = false;

            dato.each(lines, function (index, item) {
                // has tab
                if (the._getIndentTimes(item.text)) {
                    if (!isTabFirstLine) {
                        isTabFirstLine = index === 0;
                    }

                    var left = value.slice(0, item.start - tabLineLength * tabSize);
                    var right = value.slice(item.end - tabLineLength * tabSize);
                    var text = item.text.slice(tabSize);

                    tabLineLength++;
                    value = left + text + right;
                }
            });

            var start = selection[0] - (isTabFirstLine ? tabSize : 0);
            var end = selection[1] - tabLineLength * tabSize;
            the._set(start, end, value);

            return the;
        },


        /**
         * 保持缩进
         * @return {Textarea}
         */
        holdIndent: function () {
            var the = this;
            var $textarea = the._eTextarea;
            var options = the._options;
            var selection = the.getSelection();
            var start = selection[0];
            var lines = the.getLines();
            var indentTimes = the._getIndentTimes(lines[0].text);
            var insertValue = '\n';

            if (indentTimes) {
                var tabSize = options.tabSize;
                var tabValue = new Array(tabSize + 1).join(' ');
                insertValue += new Array(indentTimes + 1).join(tabValue);
                start += tabSize * indentTimes;
            }

            start += 1;
            textarea.insert($textarea, insertValue, false);
            the._set(start, start, $textarea.value);
            return the;
        },


        /**
         * 插入
         * @param text {String} 文本
         * @param select {Boolean} 是否选中插入文本
         * @returns {Textarea}
         */
        insert: function (text, select) {
            var the = this;
            textarea.insert(the._eTextarea, text, select);
            return the;
        },


        /**
         * 包裹
         * @param before {String} 前置文本
         * @param after {String} 后置文本
         * @param select {Boolean} 是否选中插入文本
         * @returns {Textarea}
         */
        wrap: function (before, after, select) {
            var the = this;
            var selection = the.getSelection();
            var $textarea = the._eTextarea;
            var value = $textarea.value;
            var text = value.slice(selection[0], selection[1]);

            textarea.insert($textarea, before + text + after, select);
            return the;
        },


        /**
         * 获取文本的缩进次数
         * @param text {String} 文本
         * @returns {Number}
         */
        _getIndentTimes: function (text) {
            var the = this;
            var options = the._options;
            var tabSize = options.tabSize;
            var regTab = new RegExp('^\\s{' + tabSize + '}');
            var times = 0;

            while (regTab.test(text)) {
                text = text.replace(regTab, '');
                times++;
            }

            return times;
        },


        /**
         * 获取当前选中的行信息
         * @param [start]
         * @param [end]
         * @returns {Array}
         */
        getLines: function (start, end) {
            var the = this;
            var $textarea = the._eTextarea;
            var selection = the.getSelection();
            start = start || selection[0];
            end = end || selection[1];
            var value = $textarea.value;
            var lines = value.split('\n');
            var ret = [];
            var lineEnd = 0;
            var inSelection = false;

            dato.each(lines, function (index, value) {
                if (index) {
                    lineEnd += 1;
                }

                var lineStart = lineEnd;
                lineEnd += value.length;
                var item = {
                    start: lineStart,
                    end: lineEnd,
                    text: value
                };

                if (inSelection && lineStart > end) {
                    return false;
                }
                // first line
                else if (!inSelection && lineEnd >= start) {
                    inSelection = true;
                    ret.push(item);
                }
                // middle inline
                else if (inSelection && lineStart >= start && lineEnd <= end) {
                    ret.push(item);
                }
                // last line
                else if (inSelection && lineEnd >= end) {
                    ret.push(item);
                }
            });

            return ret;
        },


        /**
         * 返回当前选区
         * @returns {Number|Number[]}
         */
        getSelection: function () {
            return textarea.getSelection(this._eTextarea);
        },


        /**
         * 设置选区
         * @param start
         * @param end
         * @returns {Textarea}
         */
        setSelection: function (start, end) {
            var the = this;

            textarea.setSelection(the._eTextarea, start, end);

            return the;
        },


        /**
         * 聚焦
         * @returns {Textarea}
         */
        focus: function () {
            var the = this;

            the._eTextarea.focus();

            return the;
        },


        /**
         * 失焦
         * @returns {Textarea}
         */
        blur: function () {
            var the = this;

            the._eTextarea.blur();

            return the;
        },


        /**
         * 入栈
         * @param start
         * @param end
         * @param value
         * @private
         */
        _set: function (start, end, value) {
            var the = this;
            var $textarea = the._eTextarea;

            if (the._stackIndex > 1) {
                the._stack.splice(0, the._stackIndex - 1);
            }

            the._stackIndex = 0;
            $textarea.value = value;
            var item = {
                start: start,
                end: end,
                value: value
            };
            the._stack.unshift(item);
            textarea.setSelection($textarea, start, end);
            the.emit('change', item);

            while (the._stack.length > the._options.historyLength) {
                the._stack.pop();
            }

            localStorage.setJSON(the._id, item);
        },


        /**
         * 取栈
         * @private
         * @param [forward] {Boolean} 是否前进
         */
        _get: function (forward) {
            var the = this;
            var maxIndex = the._stack.length - 1;

            the._stackIndex += forward ? -1 : 1;

            if (the._stackIndex > maxIndex) {
                the._stackIndex = maxIndex;
                return;
            } else if (the._stackIndex < 0) {
                the._stackIndex = 0;
                return;
            }

            var point = the._stack[the._stackIndex];
            var $textarea = the._eTextarea;
            $textarea.value = point.value;
            textarea.setSelection($textarea, point.start, point.end);
            localStorage.setJSON(the._id, point);
        }
    });

    Textarea.defaults = defaults;
    module.exports = Textarea;
});