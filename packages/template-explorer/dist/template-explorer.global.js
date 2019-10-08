(function () {
  'use strict';

  function defaultOnError(error) {
      throw error;
  }
  function createCompilerError(code, loc) {
      const msg =  errorMessages[code] ;
      const locInfo = loc ? ` (${loc.start.line}:${loc.start.column})` : ``;
      const error = new SyntaxError(msg + locInfo);
      error.code = code;
      error.loc = loc;
      return error;
  }
  const errorMessages = {
      // parse errors
      [0 /* ABRUPT_CLOSING_OF_EMPTY_COMMENT */]: 'Illegal comment.',
      [1 /* ABSENCE_OF_DIGITS_IN_NUMERIC_CHARACTER_REFERENCE */]: 'Illegal numeric character reference: invalid character.',
      [2 /* CDATA_IN_HTML_CONTENT */]: 'CDATA section is allowed only in XML context.',
      [3 /* CHARACTER_REFERENCE_OUTSIDE_UNICODE_RANGE */]: 'Illegal numeric character reference: too big.',
      [4 /* CONTROL_CHARACTER_REFERENCE */]: 'Illegal numeric character reference: control character.',
      [5 /* DUPLICATE_ATTRIBUTE */]: 'Duplicate attribute.',
      [6 /* END_TAG_WITH_ATTRIBUTES */]: 'End tag cannot have attributes.',
      [7 /* END_TAG_WITH_TRAILING_SOLIDUS */]: "Illegal '/' in tags.",
      [8 /* EOF_BEFORE_TAG_NAME */]: 'Unexpected EOF in tag.',
      [9 /* EOF_IN_CDATA */]: 'Unexpected EOF in CDATA section.',
      [10 /* EOF_IN_COMMENT */]: 'Unexpected EOF in comment.',
      [11 /* EOF_IN_SCRIPT_HTML_COMMENT_LIKE_TEXT */]: 'Unexpected EOF in script.',
      [12 /* EOF_IN_TAG */]: 'Unexpected EOF in tag.',
      [13 /* INCORRECTLY_CLOSED_COMMENT */]: 'Incorrectly closed comment.',
      [14 /* INCORRECTLY_OPENED_COMMENT */]: 'Incorrectly opened comment.',
      [15 /* INVALID_FIRST_CHARACTER_OF_TAG_NAME */]: "Illegal tag name. Use '&lt;' to print '<'.",
      [16 /* MISSING_ATTRIBUTE_VALUE */]: 'Attribute value was expected.',
      [17 /* MISSING_END_TAG_NAME */]: 'End tag name was expected.',
      [18 /* MISSING_SEMICOLON_AFTER_CHARACTER_REFERENCE */]: 'Semicolon was expected.',
      [19 /* MISSING_WHITESPACE_BETWEEN_ATTRIBUTES */]: 'Whitespace was expected.',
      [20 /* NESTED_COMMENT */]: "Unexpected '<!--' in comment.",
      [21 /* NONCHARACTER_CHARACTER_REFERENCE */]: 'Illegal numeric character reference: non character.',
      [22 /* NULL_CHARACTER_REFERENCE */]: 'Illegal numeric character reference: null character.',
      [23 /* SURROGATE_CHARACTER_REFERENCE */]: 'Illegal numeric character reference: non-pair surrogate.',
      [24 /* UNEXPECTED_CHARACTER_IN_ATTRIBUTE_NAME */]: 'Attribute name cannot contain U+0022 ("), U+0027 (\'), and U+003C (<).',
      [25 /* UNEXPECTED_CHARACTER_IN_UNQUOTED_ATTRIBUTE_VALUE */]: 'Unquoted attribute value cannot contain U+0022 ("), U+0027 (\'), U+003C (<), U+003D (=), and U+0060 (`).',
      [26 /* UNEXPECTED_EQUALS_SIGN_BEFORE_ATTRIBUTE_NAME */]: "Attribute name cannot start with '='.",
      [28 /* UNEXPECTED_QUESTION_MARK_INSTEAD_OF_TAG_NAME */]: "'<?' is allowed only in XML context.",
      [29 /* UNEXPECTED_SOLIDUS_IN_TAG */]: "Illegal '/' in tags.",
      [30 /* UNKNOWN_NAMED_CHARACTER_REFERENCE */]: 'Unknown entity name.',
      // Vue-specific parse errors
      [31 /* X_INVALID_END_TAG */]: 'Invalid end tag.',
      [32 /* X_MISSING_END_TAG */]: 'End tag was not found.',
      [33 /* X_MISSING_INTERPOLATION_END */]: 'Interpolation end sign was not found.',
      [34 /* X_MISSING_DYNAMIC_DIRECTIVE_ARGUMENT_END */]: 'End bracket for dynamic directive argument was not found. ' +
          'Note that dynamic directive argument cannot contain spaces.',
      // transform errors
      [35 /* X_IF_NO_EXPRESSION */]: `v-if/v-else-if is missing expression.`,
      [36 /* X_ELSE_NO_ADJACENT_IF */]: `v-else/v-else-if has no adjacent v-if.`,
      [37 /* X_FOR_NO_EXPRESSION */]: `v-for is missing expression.`,
      [38 /* X_FOR_MALFORMED_EXPRESSION */]: `v-for has invalid expression.`,
      [39 /* X_V_BIND_NO_EXPRESSION */]: `v-bind is missing expression.`,
      [40 /* X_V_ON_NO_EXPRESSION */]: `v-on is missing expression.`,
      [41 /* X_UNEXPECTED_DIRECTIVE_ON_SLOT_OUTLET */]: `Unexpected custom directive on <slot> outlet.`,
      [42 /* X_NAMED_SLOT_ON_COMPONENT */]: `Named v-slot on component. ` +
          `Named slots should use <template v-slot> syntax nested inside the component.`,
      [43 /* X_MIXED_SLOT_USAGE */]: `Mixed v-slot usage on both the component and nested <template>.` +
          `The default slot should also use <template> syntax when there are other ` +
          `named slots to avoid scope ambiguity.`,
      [44 /* X_DUPLICATE_SLOT_NAMES */]: `Duplicate slot names found. `,
      [45 /* X_EXTRANEOUS_NON_SLOT_CHILDREN */]: `Extraneous children found when component has explicit slots. ` +
          `These children will be ignored.`,
      [46 /* X_MISPLACED_V_SLOT */]: `v-slot can only be used on components or <template> tags.`,
      // generic errors
      [47 /* X_PREFIX_ID_NOT_SUPPORTED */]: `"prefixIdentifiers" option is not supported in this build of compiler.`,
      [48 /* X_MODULE_MODE_NOT_SUPPORTED */]: `ES module mode is not supported in this build of compiler.`
  };

  // Patch flags are optimization hints generated by the compiler.
  // dev only flag -> name mapping
  const PatchFlagNames = {
      [1 /* TEXT */]: `TEXT`,
      [2 /* CLASS */]: `CLASS`,
      [4 /* STYLE */]: `STYLE`,
      [8 /* PROPS */]: `PROPS`,
      [32 /* NEED_PATCH */]: `NEED_PATCH`,
      [16 /* FULL_PROPS */]: `FULL_PROPS`,
      [64 /* KEYED_FRAGMENT */]: `KEYED_FRAGMENT`,
      [128 /* UNKEYED_FRAGMENT */]: `UNKEYED_FRAGMENT`,
      [256 /* DYNAMIC_SLOTS */]: `DYNAMIC_SLOTS`,
      [-1 /* BAIL */]: `BAIL`
  };

  const globalsWhitelist = new Set(('Infinity,undefined,NaN,isFinite,isNaN,parseFloat,parseInt,decodeURI,' +
      'decodeURIComponent,encodeURI,encodeURIComponent,Math,Number,Date,Array,' +
      'Object,Boolean,String,RegExp,Map,Set,JSON,Intl').split(','));

  const EMPTY_OBJ =  Object.freeze({})
      ;
  const EMPTY_ARR = [];
  const NOOP = () => { };
  const isOn = (key) => key[0] === 'o' && key[1] === 'n';
  const extend = (a, b) => {
      for (const key in b) {
          a[key] = b[key];
      }
      return a;
  };
  const hasOwnProperty = Object.prototype.hasOwnProperty;
  const hasOwn = (val, key) => hasOwnProperty.call(val, key);
  const isArray = Array.isArray;
  const isFunction = (val) => typeof val === 'function';
  const isString = (val) => typeof val === 'string';
  const isSymbol = (val) => typeof val === 'symbol';
  const isObject = (val) => val !== null && typeof val === 'object';
  const objectToString = Object.prototype.toString;
  const toTypeString = (value) => objectToString.call(value);
  const vnodeHooksRE = /^vnode/;
  const isReservedProp = (key) => key === 'key' || key === 'ref' || vnodeHooksRE.test(key);
  const camelizeRE = /-(\w)/g;
  const camelize = (str) => {
      return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''));
  };
  const hyphenateRE = /\B([A-Z])/g;
  const hyphenate = (str) => {
      return str.replace(hyphenateRE, '-$1').toLowerCase();
  };
  const capitalize = (str) => {
      return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // AST Utilities ---------------------------------------------------------------
  // Some expressions, e.g. sequence and conditional expressions, are never
  // associated with template nodes, so their source locations are just a stub.
  // Container types like CompoundExpression also don't need a real location.
  const locStub = {
      source: '',
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 1, column: 1, offset: 0 }
  };
  function createArrayExpression(elements, loc = locStub) {
      return {
          type: 15 /* JS_ARRAY_EXPRESSION */,
          loc,
          elements
      };
  }
  function createObjectExpression(properties, loc = locStub) {
      return {
          type: 13 /* JS_OBJECT_EXPRESSION */,
          loc,
          properties
      };
  }
  function createObjectProperty(key, value) {
      return {
          type: 14 /* JS_PROPERTY */,
          loc: locStub,
          key: isString(key) ? createSimpleExpression(key, true) : key,
          value
      };
  }
  function createSimpleExpression(content, isStatic, loc = locStub) {
      return {
          type: 4 /* SIMPLE_EXPRESSION */,
          loc,
          content,
          isStatic
      };
  }
  function createCompoundExpression(children) {
      return {
          type: 8 /* COMPOUND_EXPRESSION */,
          loc: locStub,
          children
      };
  }
  function createCallExpression(callee, args = [], loc = locStub) {
      return {
          type: 12 /* JS_CALL_EXPRESSION */,
          loc,
          callee,
          arguments: args
      };
  }
  function createFunctionExpression(params, returns, newline = false, loc = locStub) {
      return {
          type: 16 /* JS_FUNCTION_EXPRESSION */,
          params,
          returns,
          newline,
          loc
      };
  }
  function createSequenceExpression(expressions) {
      return {
          type: 17 /* JS_SEQUENCE_EXPRESSION */,
          expressions,
          loc: locStub
      };
  }
  function createConditionalExpression(test, consequent, alternate) {
      return {
          type: 18 /* JS_CONDITIONAL_EXPRESSION */,
          test,
          consequent,
          alternate,
          loc: locStub
      };
  }

  const FRAGMENT = Symbol( `Fragment` );
  const PORTAL = Symbol( `Portal` );
  const COMMENT = Symbol( `Comment` );
  const TEXT = Symbol( `Text` );
  const SUSPENSE = Symbol( `Suspense` );
  const EMPTY = Symbol( `Empty` );
  const OPEN_BLOCK = Symbol( `openBlock` );
  const CREATE_BLOCK = Symbol( `createBlock` );
  const CREATE_VNODE = Symbol( `createVNode` );
  const RESOLVE_COMPONENT = Symbol( `resolveComponent` );
  const RESOLVE_DIRECTIVE = Symbol( `resolveDirective` );
  const APPLY_DIRECTIVES = Symbol( `applyDirectives` );
  const RENDER_LIST = Symbol( `renderList` );
  const RENDER_SLOT = Symbol( `renderSlot` );
  const CREATE_SLOTS = Symbol( `createSlots` );
  const TO_STRING = Symbol( `toString` );
  const MERGE_PROPS = Symbol( `mergeProps` );
  const TO_HANDLERS = Symbol( `toHandlers` );
  const CAMELIZE = Symbol( `camelize` );
  // Name mapping for runtime helpers that need to be imported from 'vue' in
  // generated code. Make sure these are correctly exported in the runtime!
  const helperNameMap = {
      [FRAGMENT]: `Fragment`,
      [PORTAL]: `Portal`,
      [COMMENT]: `Comment`,
      [TEXT]: `Text`,
      [SUSPENSE]: `Suspense`,
      [EMPTY]: `Empty`,
      [OPEN_BLOCK]: `openBlock`,
      [CREATE_BLOCK]: `createBlock`,
      [CREATE_VNODE]: `createVNode`,
      [RESOLVE_COMPONENT]: `resolveComponent`,
      [RESOLVE_DIRECTIVE]: `resolveDirective`,
      [APPLY_DIRECTIVES]: `applyDirectives`,
      [RENDER_LIST]: `renderList`,
      [RENDER_SLOT]: `renderSlot`,
      [CREATE_SLOTS]: `createSlots`,
      [TO_STRING]: `toString`,
      [MERGE_PROPS]: `mergeProps`,
      [TO_HANDLERS]: `toHandlers`,
      [CAMELIZE]: `camelize`
  };

  // cache node requires
  // lazy require dependencies so that they don't end up in rollup's dep graph
  // and thus can be tree-shaken in browser builds.
  let _parse;
  let _walk;
  function loadDep(name) {
      if (typeof process !== 'undefined' && isFunction(require)) {
          return require(name);
      }
      else {
          // This is only used when we are building a dev-only build of the compiler
          // which runs in the browser but also uses Node deps.
          return window._deps[name];
      }
  }
  const parseJS = (code, options) => {
      assert(!false, `Expression AST analysis can only be performed in non-browser builds.`);
      const parse = _parse || (_parse = loadDep('acorn').parse);
      return parse(code, options);
  };
  const walkJS = (ast, walker) => {
      assert(!false, `Expression AST analysis can only be performed in non-browser builds.`);
      const walk = _walk || (_walk = loadDep('estree-walker').walk);
      return walk(ast, walker);
  };
  const isSimpleIdentifier = (name) => !/^\d|[^\w]/.test(name);
  function getInnerRange(loc, offset, length) {
       assert(offset <= loc.source.length);
      const source = loc.source.substr(offset, length);
      const newLoc = {
          source,
          start: advancePositionWithClone(loc.start, loc.source, offset),
          end: loc.end
      };
      if (length != null) {
           assert(offset + length <= loc.source.length);
          newLoc.end = advancePositionWithClone(loc.start, loc.source, offset + length);
      }
      return newLoc;
  }
  function advancePositionWithClone(pos, source, numberOfCharacters = source.length) {
      return advancePositionWithMutation({ ...pos }, source, numberOfCharacters);
  }
  // advance by mutation without cloning (for performance reasons), since this
  // gets called a lot in the parser
  function advancePositionWithMutation(pos, source, numberOfCharacters = source.length) {
      let linesCount = 0;
      let lastNewLinePos = -1;
      for (let i = 0; i < numberOfCharacters; i++) {
          if (source.charCodeAt(i) === 10 /* newline char code */) {
              linesCount++;
              lastNewLinePos = i;
          }
      }
      pos.offset += numberOfCharacters;
      pos.line += linesCount;
      pos.column =
          lastNewLinePos === -1
              ? pos.column + numberOfCharacters
              : Math.max(1, numberOfCharacters - lastNewLinePos);
      return pos;
  }
  function assert(condition, msg) {
      /* istanbul ignore if */
      if (!condition) {
          throw new Error(msg || `unexpected compiler condition`);
      }
  }
  function findDir(node, name, allowEmpty = false) {
      for (let i = 0; i < node.props.length; i++) {
          const p = node.props[i];
          if (p.type === 7 /* DIRECTIVE */ &&
              (allowEmpty || p.exp) &&
              (isString(name) ? p.name === name : name.test(p.name))) {
              return p;
          }
      }
  }
  function findProp(node, name) {
      for (let i = 0; i < node.props.length; i++) {
          const p = node.props[i];
          if (p.type === 6 /* ATTRIBUTE */) {
              if (p.name === name && p.value && !p.value.isEmpty) {
                  return p;
              }
          }
          else if (p.arg &&
              p.arg.type === 4 /* SIMPLE_EXPRESSION */ &&
              p.arg.isStatic &&
              p.arg.content === name &&
              p.exp) {
              return p;
          }
      }
  }
  function createBlockExpression(args, context) {
      return createSequenceExpression([
          createCallExpression(context.helper(OPEN_BLOCK)),
          createCallExpression(context.helper(CREATE_BLOCK), args)
      ]);
  }
  const isVSlot = (p) => p.type === 7 /* DIRECTIVE */ && p.name === 'slot';
  const isTemplateNode = (node) => node.type === 1 /* ELEMENT */ && node.tagType === 3 /* TEMPLATE */;
  const isSlotOutlet = (node) => node.type === 1 /* ELEMENT */ && node.tagType === 2 /* SLOT */;
  function injectProp(props, prop, context) {
      if (props == null || props === `null`) {
          return createObjectExpression([prop]);
      }
      else if (props.type === 12 /* JS_CALL_EXPRESSION */) {
          // merged props... add ours
          // only inject key to object literal if it's the first argument so that
          // if doesn't override user provided keys
          const first = props.arguments[0];
          if (!isString(first) && first.type === 13 /* JS_OBJECT_EXPRESSION */) {
              first.properties.unshift(prop);
          }
          else {
              props.arguments.unshift(createObjectExpression([prop]));
          }
          return props;
      }
      else if (props.type === 13 /* JS_OBJECT_EXPRESSION */) {
          props.properties.unshift(prop);
          return props;
      }
      else {
          // single v-bind with expression, return a merged replacement
          return createCallExpression(context.helper(MERGE_PROPS), [
              createObjectExpression([prop]),
              props
          ]);
      }
  }
  function toValidAssetId(name, type) {
      return `_${type}_${name.replace(/[^\w]/g, '')}`;
  }

  const defaultParserOptions = {
      delimiters: [`{{`, `}}`],
      ignoreSpaces: true,
      getNamespace: () => 0 /* HTML */,
      getTextMode: () => 0 /* DATA */,
      isVoidTag: () => false,
      namedCharacterReferences: {
          'gt;': '>',
          'lt;': '<',
          'amp;': '&',
          'apos;': "'",
          'quot;': '"'
      },
      onError: defaultOnError
  };
  function parse(content, options = {}) {
      const context = createParserContext(content, options);
      const start = getCursor(context);
      return {
          type: 0 /* ROOT */,
          children: parseChildren(context, 0 /* DATA */, []),
          helpers: [],
          components: [],
          directives: [],
          hoists: [],
          codegenNode: undefined,
          loc: getSelection(context, start)
      };
  }
  function createParserContext(content, options) {
      return {
          options: {
              ...defaultParserOptions,
              ...options
          },
          column: 1,
          line: 1,
          offset: 0,
          originalSource: content,
          source: content,
          maxCRNameLength: Object.keys(options.namedCharacterReferences ||
              defaultParserOptions.namedCharacterReferences).reduce((max, name) => Math.max(max, name.length), 0)
      };
  }
  function parseChildren(context, mode, ancestors) {
      const parent = last(ancestors);
      const ns = parent ? parent.ns : 0 /* HTML */;
      const nodes = [];
      while (!isEnd(context, mode, ancestors)) {
           assert(context.source.length > 0);
          const s = context.source;
          let node = undefined;
          if (startsWith(s, context.options.delimiters[0])) {
              // '{{'
              node = parseInterpolation(context, mode);
          }
          else if (mode === 0 /* DATA */ && s[0] === '<') {
              // https://html.spec.whatwg.org/multipage/parsing.html#tag-open-state
              if (s.length === 1) {
                  emitError(context, 8 /* EOF_BEFORE_TAG_NAME */, 1);
              }
              else if (s[1] === '!') {
                  // https://html.spec.whatwg.org/multipage/parsing.html#markup-declaration-open-state
                  if (startsWith(s, '<!--')) {
                      node = parseComment(context);
                  }
                  else if (startsWith(s, '<!DOCTYPE')) {
                      // Ignore DOCTYPE by a limitation.
                      node = parseBogusComment(context);
                  }
                  else if (startsWith(s, '<![CDATA[')) {
                      if (ns !== 0 /* HTML */) {
                          node = parseCDATA(context, ancestors);
                      }
                      else {
                          emitError(context, 2 /* CDATA_IN_HTML_CONTENT */);
                          node = parseBogusComment(context);
                      }
                  }
                  else {
                      emitError(context, 14 /* INCORRECTLY_OPENED_COMMENT */);
                      node = parseBogusComment(context);
                  }
              }
              else if (s[1] === '/') {
                  // https://html.spec.whatwg.org/multipage/parsing.html#end-tag-open-state
                  if (s.length === 2) {
                      emitError(context, 8 /* EOF_BEFORE_TAG_NAME */, 2);
                  }
                  else if (s[2] === '>') {
                      emitError(context, 17 /* MISSING_END_TAG_NAME */, 2);
                      advanceBy(context, 3);
                      continue;
                  }
                  else if (/[a-z]/i.test(s[2])) {
                      emitError(context, 31 /* X_INVALID_END_TAG */);
                      parseTag(context, 1 /* End */, parent);
                      continue;
                  }
                  else {
                      emitError(context, 15 /* INVALID_FIRST_CHARACTER_OF_TAG_NAME */, 2);
                      node = parseBogusComment(context);
                  }
              }
              else if (/[a-z]/i.test(s[1])) {
                  node = parseElement(context, ancestors);
              }
              else if (s[1] === '?') {
                  emitError(context, 28 /* UNEXPECTED_QUESTION_MARK_INSTEAD_OF_TAG_NAME */, 1);
                  node = parseBogusComment(context);
              }
              else {
                  emitError(context, 15 /* INVALID_FIRST_CHARACTER_OF_TAG_NAME */, 1);
              }
          }
          if (!node) {
              node = parseText(context, mode);
          }
          if (Array.isArray(node)) {
              for (let i = 0; i < node.length; i++) {
                  pushNode(context, nodes, node[i]);
              }
          }
          else {
              pushNode(context, nodes, node);
          }
      }
      return nodes;
  }
  function pushNode(context, nodes, node) {
      if (context.options.ignoreSpaces &&
          node.type === 2 /* TEXT */ &&
          node.isEmpty) {
          return;
      }
      // Merge if both this and the previous node are text and those are consecutive.
      // This happens on "a < b" or something like.
      const prev = last(nodes);
      if (prev &&
          prev.type === 2 /* TEXT */ &&
          node.type === 2 /* TEXT */ &&
          prev.loc.end.offset === node.loc.start.offset) {
          prev.content += node.content;
          prev.isEmpty = prev.content.trim().length === 0;
          prev.loc.end = node.loc.end;
          prev.loc.source += node.loc.source;
      }
      else {
          nodes.push(node);
      }
  }
  function parseCDATA(context, ancestors) {
      
          assert(last(ancestors) == null || last(ancestors).ns !== 0 /* HTML */);
       assert(startsWith(context.source, '<![CDATA['));
      advanceBy(context, 9);
      const nodes = parseChildren(context, 3 /* CDATA */, ancestors);
      if (context.source.length === 0) {
          emitError(context, 9 /* EOF_IN_CDATA */);
      }
      else {
           assert(startsWith(context.source, ']]>'));
          advanceBy(context, 3);
      }
      return nodes;
  }
  function parseComment(context) {
       assert(startsWith(context.source, '<!--'));
      const start = getCursor(context);
      let content;
      // Regular comment.
      const match = /--(\!)?>/.exec(context.source);
      if (!match) {
          content = context.source.slice(4);
          advanceBy(context, context.source.length);
          emitError(context, 10 /* EOF_IN_COMMENT */);
      }
      else {
          if (match.index <= 3) {
              emitError(context, 0 /* ABRUPT_CLOSING_OF_EMPTY_COMMENT */);
          }
          if (match[1]) {
              emitError(context, 13 /* INCORRECTLY_CLOSED_COMMENT */);
          }
          content = context.source.slice(4, match.index);
          // Advancing with reporting nested comments.
          const s = context.source.slice(0, match.index);
          let prevIndex = 1, nestedIndex = 0;
          while ((nestedIndex = s.indexOf('<!--', prevIndex)) !== -1) {
              advanceBy(context, nestedIndex - prevIndex + 1);
              if (nestedIndex + 4 < s.length) {
                  emitError(context, 20 /* NESTED_COMMENT */);
              }
              prevIndex = nestedIndex + 1;
          }
          advanceBy(context, match.index + match[0].length - prevIndex + 1);
      }
      return {
          type: 3 /* COMMENT */,
          content,
          loc: getSelection(context, start)
      };
  }
  function parseBogusComment(context) {
       assert(/^<(?:[\!\?]|\/[^a-z>])/i.test(context.source));
      const start = getCursor(context);
      const contentStart = context.source[1] === '?' ? 1 : 2;
      let content;
      const closeIndex = context.source.indexOf('>');
      if (closeIndex === -1) {
          content = context.source.slice(contentStart);
          advanceBy(context, context.source.length);
      }
      else {
          content = context.source.slice(contentStart, closeIndex);
          advanceBy(context, closeIndex + 1);
      }
      return {
          type: 3 /* COMMENT */,
          content,
          loc: getSelection(context, start)
      };
  }
  function parseElement(context, ancestors) {
       assert(/^<[a-z]/i.test(context.source));
      // Start tag.
      const parent = last(ancestors);
      const element = parseTag(context, 0 /* Start */, parent);
      if (element.isSelfClosing || context.options.isVoidTag(element.tag)) {
          return element;
      }
      // Children.
      ancestors.push(element);
      const mode = context.options.getTextMode(element.tag, element.ns);
      const children = parseChildren(context, mode, ancestors);
      ancestors.pop();
      element.children = children;
      // End tag.
      if (startsWithEndTagOpen(context.source, element.tag)) {
          parseTag(context, 1 /* End */, parent);
      }
      else {
          emitError(context, 32 /* X_MISSING_END_TAG */);
          if (context.source.length === 0 && element.tag.toLowerCase() === 'script') {
              const first = children[0];
              if (first && startsWith(first.loc.source, '<!--')) {
                  emitError(context, 11 /* EOF_IN_SCRIPT_HTML_COMMENT_LIKE_TEXT */);
              }
          }
      }
      element.loc = getSelection(context, element.loc.start);
      return element;
  }
  /**
   * Parse a tag (E.g. `<div id=a>`) with that type (start tag or end tag).
   */
  function parseTag(context, type, parent) {
       assert(/^<\/?[a-z]/i.test(context.source));
      
          assert(type === (startsWith(context.source, '</') ? 1 /* End */ : 0 /* Start */));
      // Tag open.
      const start = getCursor(context);
      const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source);
      const tag = match[1];
      const props = [];
      const ns = context.options.getNamespace(tag, parent);
      let tagType = 0 /* ELEMENT */;
      if (tag === 'slot')
          tagType = 2 /* SLOT */;
      else if (tag === 'template')
          tagType = 3 /* TEMPLATE */;
      else if (/[A-Z-]/.test(tag))
          tagType = 1 /* COMPONENT */;
      advanceBy(context, match[0].length);
      advanceSpaces(context);
      // Attributes.
      const attributeNames = new Set();
      while (context.source.length > 0 &&
          !startsWith(context.source, '>') &&
          !startsWith(context.source, '/>')) {
          if (startsWith(context.source, '/')) {
              emitError(context, 29 /* UNEXPECTED_SOLIDUS_IN_TAG */);
              advanceBy(context, 1);
              advanceSpaces(context);
              continue;
          }
          if (type === 1 /* End */) {
              emitError(context, 6 /* END_TAG_WITH_ATTRIBUTES */);
          }
          const attr = parseAttribute(context, attributeNames);
          if (type === 0 /* Start */) {
              props.push(attr);
          }
          if (/^[^\t\r\n\f />]/.test(context.source)) {
              emitError(context, 19 /* MISSING_WHITESPACE_BETWEEN_ATTRIBUTES */);
          }
          advanceSpaces(context);
      }
      // Tag close.
      let isSelfClosing = false;
      if (context.source.length === 0) {
          emitError(context, 12 /* EOF_IN_TAG */);
      }
      else {
          isSelfClosing = startsWith(context.source, '/>');
          if (type === 1 /* End */ && isSelfClosing) {
              emitError(context, 7 /* END_TAG_WITH_TRAILING_SOLIDUS */);
          }
          advanceBy(context, isSelfClosing ? 2 : 1);
      }
      return {
          type: 1 /* ELEMENT */,
          ns,
          tag,
          tagType,
          props,
          isSelfClosing,
          children: [],
          loc: getSelection(context, start),
          codegenNode: undefined // to be created during transform phase
      };
  }
  function parseAttribute(context, nameSet) {
       assert(/^[^\t\r\n\f />]/.test(context.source));
      // Name.
      const start = getCursor(context);
      const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source);
      const name = match[0];
      if (nameSet.has(name)) {
          emitError(context, 5 /* DUPLICATE_ATTRIBUTE */);
      }
      nameSet.add(name);
      if (name[0] === '=') {
          emitError(context, 26 /* UNEXPECTED_EQUALS_SIGN_BEFORE_ATTRIBUTE_NAME */);
      }
      {
          const pattern = /["'<]/g;
          let m;
          while ((m = pattern.exec(name)) !== null) {
              emitError(context, 24 /* UNEXPECTED_CHARACTER_IN_ATTRIBUTE_NAME */, m.index);
          }
      }
      advanceBy(context, name.length);
      // Value
      let value = undefined;
      if (/^[\t\r\n\f ]*=/.test(context.source)) {
          advanceSpaces(context);
          advanceBy(context, 1);
          advanceSpaces(context);
          value = parseAttributeValue(context);
          if (!value) {
              emitError(context, 16 /* MISSING_ATTRIBUTE_VALUE */);
          }
      }
      const loc = getSelection(context, start);
      if (/^(v-|:|@|#)/.test(name)) {
          const match = /(?:^v-([a-z0-9-]+))?(?:(?::|^@|^#)([^\.]+))?(.+)?$/i.exec(name);
          let arg;
          if (match[2]) {
              const startOffset = name.split(match[2], 2).shift().length;
              const loc = getSelection(context, getNewPosition(context, start, startOffset), getNewPosition(context, start, startOffset + match[2].length));
              let content = match[2];
              let isStatic = true;
              if (content.startsWith('[')) {
                  isStatic = false;
                  if (!content.endsWith(']')) {
                      emitError(context, 34 /* X_MISSING_DYNAMIC_DIRECTIVE_ARGUMENT_END */);
                  }
                  content = content.substr(1, content.length - 2);
              }
              arg = {
                  type: 4 /* SIMPLE_EXPRESSION */,
                  content,
                  isStatic,
                  loc
              };
          }
          if (value && value.isQuoted) {
              const valueLoc = value.loc;
              valueLoc.start.offset++;
              valueLoc.start.column++;
              valueLoc.end = advancePositionWithClone(valueLoc.start, value.content);
              valueLoc.source = valueLoc.source.slice(1, -1);
          }
          return {
              type: 7 /* DIRECTIVE */,
              name: match[1] ||
                  (startsWith(name, ':')
                      ? 'bind'
                      : startsWith(name, '@')
                          ? 'on'
                          : 'slot'),
              exp: value && {
                  type: 4 /* SIMPLE_EXPRESSION */,
                  content: value.content,
                  isStatic: false,
                  loc: value.loc
              },
              arg,
              modifiers: match[3] ? match[3].substr(1).split('.') : [],
              loc
          };
      }
      return {
          type: 6 /* ATTRIBUTE */,
          name,
          value: value && {
              type: 2 /* TEXT */,
              content: value.content,
              isEmpty: value.content.trim().length === 0,
              loc: value.loc
          },
          loc
      };
  }
  function parseAttributeValue(context) {
      const start = getCursor(context);
      let content;
      const quote = context.source[0];
      const isQuoted = quote === `"` || quote === `'`;
      if (isQuoted) {
          // Quoted value.
          advanceBy(context, 1);
          const endIndex = context.source.indexOf(quote);
          if (endIndex === -1) {
              content = parseTextData(context, context.source.length, 4 /* ATTRIBUTE_VALUE */);
          }
          else {
              content = parseTextData(context, endIndex, 4 /* ATTRIBUTE_VALUE */);
              advanceBy(context, 1);
          }
      }
      else {
          // Unquoted
          const match = /^[^\t\r\n\f >]+/.exec(context.source);
          if (!match) {
              return undefined;
          }
          let unexpectedChars = /["'<=`]/g;
          let m;
          while ((m = unexpectedChars.exec(match[0])) !== null) {
              emitError(context, 25 /* UNEXPECTED_CHARACTER_IN_UNQUOTED_ATTRIBUTE_VALUE */, m.index);
          }
          content = parseTextData(context, match[0].length, 4 /* ATTRIBUTE_VALUE */);
      }
      return { content, isQuoted, loc: getSelection(context, start) };
  }
  function parseInterpolation(context, mode) {
      const [open, close] = context.options.delimiters;
       assert(startsWith(context.source, open));
      const closeIndex = context.source.indexOf(close, open.length);
      if (closeIndex === -1) {
          emitError(context, 33 /* X_MISSING_INTERPOLATION_END */);
          return undefined;
      }
      const start = getCursor(context);
      advanceBy(context, open.length);
      const innerStart = getCursor(context);
      const innerEnd = getCursor(context);
      const rawContentLength = closeIndex - open.length;
      const rawContent = context.source.slice(0, rawContentLength);
      const preTrimContent = parseTextData(context, rawContentLength, mode);
      const content = preTrimContent.trim();
      const startOffset = preTrimContent.indexOf(content);
      if (startOffset > 0) {
          advancePositionWithMutation(innerStart, rawContent, startOffset);
      }
      const endOffset = rawContentLength - (preTrimContent.length - content.length - startOffset);
      advancePositionWithMutation(innerEnd, rawContent, endOffset);
      advanceBy(context, close.length);
      return {
          type: 5 /* INTERPOLATION */,
          content: {
              type: 4 /* SIMPLE_EXPRESSION */,
              isStatic: false,
              content,
              loc: getSelection(context, innerStart, innerEnd)
          },
          loc: getSelection(context, start)
      };
  }
  function parseText(context, mode) {
       assert(context.source.length > 0);
      const [open] = context.options.delimiters;
      const endIndex = Math.min(...[
          context.source.indexOf('<', 1),
          context.source.indexOf(open, 1),
          mode === 3 /* CDATA */ ? context.source.indexOf(']]>') : -1,
          context.source.length
      ].filter(n => n !== -1));
       assert(endIndex > 0);
      const start = getCursor(context);
      const content = parseTextData(context, endIndex, mode);
      return {
          type: 2 /* TEXT */,
          content,
          loc: getSelection(context, start),
          isEmpty: !content.trim()
      };
  }
  /**
   * Get text data with a given length from the current location.
   * This translates HTML entities in the text data.
   */
  function parseTextData(context, length, mode) {
      if (mode === 2 /* RAWTEXT */ || mode === 3 /* CDATA */) {
          const text = context.source.slice(0, length);
          advanceBy(context, length);
          return text;
      }
      // DATA or RCDATA. Entity decoding required.
      const end = context.offset + length;
      let text = '';
      while (context.offset < end) {
          const head = /&(?:#x?)?/i.exec(context.source);
          if (!head || context.offset + head.index >= end) {
              const remaining = end - context.offset;
              text += context.source.slice(0, remaining);
              advanceBy(context, remaining);
              break;
          }
          // Advance to the "&".
          text += context.source.slice(0, head.index);
          advanceBy(context, head.index);
          if (head[0] === '&') {
              // Named character reference.
              let name = '', value = undefined;
              if (/[0-9a-z]/i.test(context.source[1])) {
                  for (let length = context.maxCRNameLength; !value && length > 0; --length) {
                      name = context.source.substr(1, length);
                      value = context.options.namedCharacterReferences[name];
                  }
                  if (value) {
                      const semi = name.endsWith(';');
                      if (mode === 4 /* ATTRIBUTE_VALUE */ &&
                          !semi &&
                          /[=a-z0-9]/i.test(context.source[1 + name.length] || '')) {
                          text += '&';
                          text += name;
                          advanceBy(context, 1 + name.length);
                      }
                      else {
                          text += value;
                          advanceBy(context, 1 + name.length);
                          if (!semi) {
                              emitError(context, 18 /* MISSING_SEMICOLON_AFTER_CHARACTER_REFERENCE */);
                          }
                      }
                  }
                  else {
                      emitError(context, 30 /* UNKNOWN_NAMED_CHARACTER_REFERENCE */);
                      text += '&';
                      text += name;
                      advanceBy(context, 1 + name.length);
                  }
              }
              else {
                  text += '&';
                  advanceBy(context, 1);
              }
          }
          else {
              // Numeric character reference.
              const hex = head[0] === '&#x';
              const pattern = hex ? /^&#x([0-9a-f]+);?/i : /^&#([0-9]+);?/;
              const body = pattern.exec(context.source);
              if (!body) {
                  text += head[0];
                  emitError(context, 1 /* ABSENCE_OF_DIGITS_IN_NUMERIC_CHARACTER_REFERENCE */);
                  advanceBy(context, head[0].length);
              }
              else {
                  // https://html.spec.whatwg.org/multipage/parsing.html#numeric-character-reference-end-state
                  let cp = Number.parseInt(body[1], hex ? 16 : 10);
                  if (cp === 0) {
                      emitError(context, 22 /* NULL_CHARACTER_REFERENCE */);
                      cp = 0xfffd;
                  }
                  else if (cp > 0x10ffff) {
                      emitError(context, 3 /* CHARACTER_REFERENCE_OUTSIDE_UNICODE_RANGE */);
                      cp = 0xfffd;
                  }
                  else if (cp >= 0xd800 && cp <= 0xdfff) {
                      emitError(context, 23 /* SURROGATE_CHARACTER_REFERENCE */);
                      cp = 0xfffd;
                  }
                  else if ((cp >= 0xfdd0 && cp <= 0xfdef) || (cp & 0xfffe) === 0xfffe) {
                      emitError(context, 21 /* NONCHARACTER_CHARACTER_REFERENCE */);
                  }
                  else if ((cp >= 0x01 && cp <= 0x08) ||
                      cp === 0x0b ||
                      (cp >= 0x0d && cp <= 0x1f) ||
                      (cp >= 0x7f && cp <= 0x9f)) {
                      emitError(context, 4 /* CONTROL_CHARACTER_REFERENCE */);
                      cp = CCR_REPLACEMENTS[cp] || cp;
                  }
                  text += String.fromCodePoint(cp);
                  advanceBy(context, body[0].length);
                  if (!body[0].endsWith(';')) {
                      emitError(context, 18 /* MISSING_SEMICOLON_AFTER_CHARACTER_REFERENCE */);
                  }
              }
          }
      }
      return text;
  }
  function getCursor(context) {
      const { column, line, offset } = context;
      return { column, line, offset };
  }
  function getSelection(context, start, end) {
      end = end || getCursor(context);
      return {
          start,
          end,
          source: context.originalSource.slice(start.offset, end.offset)
      };
  }
  function last(xs) {
      return xs[xs.length - 1];
  }
  function startsWith(source, searchString) {
      return source.startsWith(searchString);
  }
  function advanceBy(context, numberOfCharacters) {
      const { source } = context;
       assert(numberOfCharacters <= source.length);
      advancePositionWithMutation(context, source, numberOfCharacters);
      context.source = source.slice(numberOfCharacters);
  }
  function advanceSpaces(context) {
      const match = /^[\t\r\n\f ]+/.exec(context.source);
      if (match) {
          advanceBy(context, match[0].length);
      }
  }
  function getNewPosition(context, start, numberOfCharacters) {
      return advancePositionWithClone(start, context.originalSource.slice(start.offset, numberOfCharacters), numberOfCharacters);
  }
  function emitError(context, code, offset) {
      const loc = getCursor(context);
      if (offset) {
          loc.offset += offset;
          loc.column += offset;
      }
      context.options.onError(createCompilerError(code, {
          start: loc,
          end: loc,
          source: ''
      }));
  }
  function isEnd(context, mode, ancestors) {
      const s = context.source;
      switch (mode) {
          case 0 /* DATA */:
              if (startsWith(s, '</')) {
                  //TODO: probably bad performance
                  for (let i = ancestors.length - 1; i >= 0; --i) {
                      if (startsWithEndTagOpen(s, ancestors[i].tag)) {
                          return true;
                      }
                  }
              }
              break;
          case 1 /* RCDATA */:
          case 2 /* RAWTEXT */: {
              const parent = last(ancestors);
              if (parent && startsWithEndTagOpen(s, parent.tag)) {
                  return true;
              }
              break;
          }
          case 3 /* CDATA */:
              if (startsWith(s, ']]>')) {
                  return true;
              }
              break;
      }
      return !s;
  }
  function startsWithEndTagOpen(source, tag) {
      return (startsWith(source, '</') &&
          source.substr(2, tag.length).toLowerCase() === tag.toLowerCase() &&
          /[\t\n\f />]/.test(source[2 + tag.length] || '>'));
  }
  // https://html.spec.whatwg.org/multipage/parsing.html#numeric-character-reference-end-state
  const CCR_REPLACEMENTS = {
      0x80: 0x20ac,
      0x82: 0x201a,
      0x83: 0x0192,
      0x84: 0x201e,
      0x85: 0x2026,
      0x86: 0x2020,
      0x87: 0x2021,
      0x88: 0x02c6,
      0x89: 0x2030,
      0x8a: 0x0160,
      0x8b: 0x2039,
      0x8c: 0x0152,
      0x8e: 0x017d,
      0x91: 0x2018,
      0x92: 0x2019,
      0x93: 0x201c,
      0x94: 0x201d,
      0x95: 0x2022,
      0x96: 0x2013,
      0x97: 0x2014,
      0x98: 0x02dc,
      0x99: 0x2122,
      0x9a: 0x0161,
      0x9b: 0x203a,
      0x9c: 0x0153,
      0x9e: 0x017e,
      0x9f: 0x0178
  };

  function hoistStatic(root, context) {
      walk(root.children, context, new Map(), isSingleElementRoot(root, root.children[0]));
  }
  function isSingleElementRoot(root, child) {
      const { children } = root;
      return (children.length === 1 &&
          child.type === 1 /* ELEMENT */ &&
          !isSlotOutlet(child));
  }
  function walk(children, context, resultCache, doNotHoistNode = false) {
      for (let i = 0; i < children.length; i++) {
          const child = children[i];
          // only plain elements are eligible for hoisting.
          if (child.type === 1 /* ELEMENT */ &&
              child.tagType === 0 /* ELEMENT */) {
              if (!doNotHoistNode && isStaticNode(child, resultCache)) {
                  child.codegenNode = context.hoist(child.codegenNode);
                  continue;
              }
              else {
                  // node may contain dynamic children, but its props may be eligible for
                  // hoisting.
                  const flag = getPatchFlag(child);
                  if (!flag ||
                      flag === 32 /* NEED_PATCH */ ||
                      flag === 1 /* TEXT */) {
                      let codegenNode = child.codegenNode;
                      if (codegenNode.callee === APPLY_DIRECTIVES) {
                          codegenNode = codegenNode.arguments[0];
                      }
                      const props = codegenNode.arguments[1];
                      if (props && props !== `null`) {
                          codegenNode.arguments[1] = context.hoist(props);
                      }
                  }
              }
          }
          if (child.type === 1 /* ELEMENT */) {
              walk(child.children, context, resultCache);
          }
          else if (child.type === 11 /* FOR */) {
              // Do not hoist v-for single child because it has to be a block
              walk(child.children, context, resultCache, child.children.length === 1);
          }
          else if (child.type === 9 /* IF */) {
              for (let i = 0; i < child.branches.length; i++) {
                  const branchChildren = child.branches[i].children;
                  // Do not hoist v-if single child because it has to be a block
                  walk(branchChildren, context, resultCache, branchChildren.length === 1);
              }
          }
      }
  }
  function getPatchFlag(node) {
      let codegenNode = node.codegenNode;
      if (codegenNode.callee === APPLY_DIRECTIVES) {
          codegenNode = codegenNode.arguments[0];
      }
      const flag = codegenNode.arguments[3];
      return flag ? parseInt(flag, 10) : undefined;
  }
  function isStaticNode(node, resultCache) {
      switch (node.type) {
          case 1 /* ELEMENT */:
              if (node.tagType !== 0 /* ELEMENT */) {
                  return false;
              }
              if (resultCache.has(node)) {
                  return resultCache.get(node);
              }
              const flag = getPatchFlag(node);
              if (!flag) {
                  // element self is static. check its children.
                  for (let i = 0; i < node.children.length; i++) {
                      if (!isStaticNode(node.children[i], resultCache)) {
                          resultCache.set(node, false);
                          return false;
                      }
                  }
                  resultCache.set(node, true);
                  return true;
              }
              else {
                  return false;
              }
          case 2 /* TEXT */:
          case 3 /* COMMENT */:
              return true;
          case 9 /* IF */:
          case 11 /* FOR */:
          case 5 /* INTERPOLATION */:
          case 8 /* COMPOUND_EXPRESSION */:
              return false;
          default:
              return false;
      }
  }

  function createTransformContext(root, { prefixIdentifiers = false, hoistStatic = false, nodeTransforms = [], directiveTransforms = {}, onError = defaultOnError }) {
      const context = {
          root,
          helpers: new Set(),
          components: new Set(),
          directives: new Set(),
          hoists: [],
          identifiers: {},
          scopes: {
              vFor: 0,
              vSlot: 0,
              vPre: 0,
              vOnce: 0
          },
          prefixIdentifiers,
          hoistStatic,
          nodeTransforms,
          directiveTransforms,
          onError,
          parent: null,
          currentNode: root,
          childIndex: 0,
          helper(name) {
              context.helpers.add(name);
              return name;
          },
          helperString(name) {
              return ((context.prefixIdentifiers ? `` : `_`) +
                  helperNameMap[context.helper(name)]);
          },
          replaceNode(node) {
              /* istanbul ignore if */
              {
                  if (!context.currentNode) {
                      throw new Error(`Node being replaced is already removed.`);
                  }
                  if (!context.parent) {
                      throw new Error(`Cannot replace root node.`);
                  }
              }
              context.parent.children[context.childIndex] = context.currentNode = node;
          },
          removeNode(node) {
              if ( !context.parent) {
                  throw new Error(`Cannot remove root node.`);
              }
              const list = context.parent.children;
              const removalIndex = node
                  ? list.indexOf(node)
                  : context.currentNode
                      ? context.childIndex
                      : -1;
              /* istanbul ignore if */
              if ( removalIndex < 0) {
                  throw new Error(`node being removed is not a child of current parent`);
              }
              if (!node || node === context.currentNode) {
                  // current node removed
                  context.currentNode = null;
                  context.onNodeRemoved();
              }
              else {
                  // sibling node removed
                  if (context.childIndex > removalIndex) {
                      context.childIndex--;
                      context.onNodeRemoved();
                  }
              }
              context.parent.children.splice(removalIndex, 1);
          },
          onNodeRemoved: () => { },
          addIdentifiers(exp) {
              // identifier tracking only happens in non-browser builds.
              {
                  if (isString(exp)) {
                      addId(exp);
                  }
                  else if (exp.identifiers) {
                      exp.identifiers.forEach(addId);
                  }
                  else if (exp.type === 4 /* SIMPLE_EXPRESSION */) {
                      addId(exp.content);
                  }
              }
          },
          removeIdentifiers(exp) {
              {
                  if (isString(exp)) {
                      removeId(exp);
                  }
                  else if (exp.identifiers) {
                      exp.identifiers.forEach(removeId);
                  }
                  else if (exp.type === 4 /* SIMPLE_EXPRESSION */) {
                      removeId(exp.content);
                  }
              }
          },
          hoist(exp) {
              context.hoists.push(exp);
              return createSimpleExpression(`_hoisted_${context.hoists.length}`, false, exp.loc);
          }
      };
      function addId(id) {
          const { identifiers } = context;
          if (identifiers[id] === undefined) {
              identifiers[id] = 0;
          }
          identifiers[id]++;
      }
      function removeId(id) {
          context.identifiers[id]--;
      }
      return context;
  }
  function transform(root, options) {
      const context = createTransformContext(root, options);
      traverseNode(root, context);
      if (options.hoistStatic) {
          hoistStatic(root, context);
      }
      finalizeRoot(root, context);
  }
  function finalizeRoot(root, context) {
      const { helper } = context;
      const { children } = root;
      const child = children[0];
      if (isSingleElementRoot(root, child) && child.codegenNode) {
          // turn root element into a block
          root.codegenNode = createBlockExpression(child.codegenNode.arguments, context);
      }
      else if (children.length === 1) {
          // - single <slot/>, IfNode, ForNode: already blocks.
          // - single text node: always patched.
          // - transform calls without transformElement (only during tests)
          // Just generate the node as-is
          root.codegenNode = child;
      }
      else if (children.length > 1) {
          // root has multiple nodes - return a fragment block.
          root.codegenNode = createBlockExpression([helper(FRAGMENT), `null`, root.children], context);
      }
      // finalize meta information
      root.helpers = [...context.helpers];
      root.components = [...context.components];
      root.directives = [...context.directives];
      root.hoists = context.hoists;
  }
  function traverseChildren(parent, context) {
      let i = 0;
      const nodeRemoved = () => {
          i--;
      };
      for (; i < parent.children.length; i++) {
          const child = parent.children[i];
          if (isString(child))
              continue;
          context.currentNode = child;
          context.parent = parent;
          context.childIndex = i;
          context.onNodeRemoved = nodeRemoved;
          traverseNode(child, context);
      }
  }
  function traverseNode(node, context) {
      // apply transform plugins
      const { nodeTransforms } = context;
      const exitFns = [];
      for (let i = 0; i < nodeTransforms.length; i++) {
          const onExit = nodeTransforms[i](node, context);
          if (onExit) {
              if (isArray(onExit)) {
                  exitFns.push(...onExit);
              }
              else {
                  exitFns.push(onExit);
              }
          }
          if (!context.currentNode) {
              // node was removed
              return;
          }
          else {
              // node may have been replaced
              node = context.currentNode;
          }
      }
      switch (node.type) {
          case 3 /* COMMENT */:
              // inject import for the Comment symbol, which is needed for creating
              // comment nodes with `createVNode`
              context.helper(CREATE_VNODE);
              context.helper(COMMENT);
              break;
          case 5 /* INTERPOLATION */:
              // no need to traverse, but we need to inject toString helper
              context.helper(TO_STRING);
              break;
          // for container types, further traverse downwards
          case 9 /* IF */:
              for (let i = 0; i < node.branches.length; i++) {
                  traverseChildren(node.branches[i], context);
              }
              break;
          case 11 /* FOR */:
          case 1 /* ELEMENT */:
          case 0 /* ROOT */:
              traverseChildren(node, context);
              break;
      }
      // exit transforms
      for (let i = 0; i < exitFns.length; i++) {
          exitFns[i]();
      }
  }
  function createStructuralDirectiveTransform(name, fn) {
      const matches = isString(name)
          ? (n) => n === name
          : (n) => name.test(n);
      return (node, context) => {
          if (node.type === 1 /* ELEMENT */) {
              const { props } = node;
              // structural directive transforms are not concerned with slots
              // as they are handled separately in vSlot.ts
              if (node.tagType === 3 /* TEMPLATE */ && props.some(isVSlot)) {
                  return;
              }
              const exitFns = [];
              for (let i = 0; i < props.length; i++) {
                  const prop = props[i];
                  if (prop.type === 7 /* DIRECTIVE */ && matches(prop.name)) {
                      // structural directives are removed to avoid infinite recursion
                      // also we remove them *before* applying so that it can further
                      // traverse itself in case it moves the node around
                      props.splice(i, 1);
                      i--;
                      const onExit = fn(node, prop, context);
                      if (onExit)
                          exitFns.push(onExit);
                  }
              }
              return exitFns;
          }
      };
  }

  function createCodegenContext(ast, { mode = 'function', prefixIdentifiers = mode === 'module', sourceMap = false, filename = `template.vue.html` }) {
      const context = {
          mode,
          prefixIdentifiers,
          sourceMap,
          filename,
          source: ast.loc.source,
          code: ``,
          column: 1,
          line: 1,
          offset: 0,
          indentLevel: 0,
          // lazy require source-map implementation, only in non-browser builds!
          map:  !sourceMap
              ? undefined
              : new (loadDep('source-map')).SourceMapGenerator(),
          helper(key) {
              const name = helperNameMap[key];
              return prefixIdentifiers ? name : `_${name}`;
          },
          push(code, node, openOnly) {
              context.code += code;
              if ( context.map) {
                  if (node) {
                      let name;
                      if (node.type === 4 /* SIMPLE_EXPRESSION */ && !node.isStatic) {
                          const content = node.content.replace(/^_ctx\./, '');
                          if (content !== node.content && isSimpleIdentifier(content)) {
                              name = content;
                          }
                      }
                      addMapping(node.loc.start, name);
                  }
                  advancePositionWithMutation(context, code);
                  if (node && !openOnly) {
                      addMapping(node.loc.end);
                  }
              }
          },
          resetMapping(loc) {
              if ( context.map) {
                  addMapping(loc.start);
              }
          },
          indent() {
              newline(++context.indentLevel);
          },
          deindent(withoutNewLine = false) {
              if (withoutNewLine) {
                  --context.indentLevel;
              }
              else {
                  newline(--context.indentLevel);
              }
          },
          newline() {
              newline(context.indentLevel);
          }
      };
      function newline(n) {
          context.push('\n' + `  `.repeat(n));
      }
      function addMapping(loc, name) {
          context.map.addMapping({
              name,
              source: context.filename,
              original: {
                  line: loc.line,
                  column: loc.column - 1 // source-map column is 0 based
              },
              generated: {
                  line: context.line,
                  column: context.column - 1
              }
          });
      }
      if ( context.map) {
          context.map.setSourceContent(filename, context.source);
      }
      return context;
  }
  function generate(ast, options = {}) {
      const context = createCodegenContext(ast, options);
      const { mode, push, helper, prefixIdentifiers, indent, deindent, newline } = context;
      const hasHelpers = ast.helpers.length > 0;
      const useWithBlock = !prefixIdentifiers && mode !== 'module';
      // preambles
      if (mode === 'function') {
          // Generate const declaration for helpers
          // In prefix mode, we place the const declaration at top so it's done
          // only once; But if we not prefixing, we place the declaration inside the
          // with block so it doesn't incur the `in` check cost for every helper access.
          if (hasHelpers) {
              if (prefixIdentifiers) {
                  push(`const { ${ast.helpers.map(helper).join(', ')} } = Vue\n`);
              }
              else {
                  // "with" mode.
                  // save Vue in a separate variable to avoid collision
                  push(`const _Vue = Vue\n`);
                  // in "with" mode, helpers are declared inside the with block to avoid
                  // has check cost, but hoists are lifted out of the function - we need
                  // to provide the helper here.
                  if (ast.hoists.length) {
                      push(`const _${helperNameMap[CREATE_VNODE]} = Vue.createVNode\n`);
                  }
              }
          }
          genHoists(ast.hoists, context);
          context.newline();
          push(`return `);
      }
      else {
          // generate import statements for helpers
          if (hasHelpers) {
              push(`import { ${ast.helpers.map(helper).join(', ')} } from "vue"\n`);
          }
          genHoists(ast.hoists, context);
          context.newline();
          push(`export default `);
      }
      // enter render function
      push(`function render() {`);
      indent();
      if (useWithBlock) {
          push(`with (this) {`);
          indent();
          // function mode const declarations should be inside with block
          // also they should be renamed to avoid collision with user properties
          if (hasHelpers) {
              push(`const { ${ast.helpers
                .map(s => `${helperNameMap[s]}: _${helperNameMap[s]}`)
                .join(', ')} } = _Vue`);
              newline();
              newline();
          }
      }
      else {
          push(`const _ctx = this`);
          newline();
      }
      // generate asset resolution statements
      if (ast.components.length) {
          genAssets(ast.components, 'component', context);
      }
      if (ast.directives.length) {
          genAssets(ast.directives, 'directive', context);
      }
      if (ast.components.length || ast.directives.length) {
          newline();
      }
      // generate the VNode tree expression
      push(`return `);
      if (ast.codegenNode) {
          genNode(ast.codegenNode, context);
      }
      else {
          push(`null`);
      }
      if (useWithBlock) {
          deindent();
          push(`}`);
      }
      deindent();
      push(`}`);
      return {
          ast,
          code: context.code,
          map: context.map ? context.map.toJSON() : undefined
      };
  }
  function genAssets(assets, type, context) {
      const resolver = context.helper(type === 'component' ? RESOLVE_COMPONENT : RESOLVE_DIRECTIVE);
      for (let i = 0; i < assets.length; i++) {
          const id = assets[i];
          context.push(`const ${toValidAssetId(id, type)} = ${resolver}(${JSON.stringify(id)})`);
          context.newline();
      }
  }
  function genHoists(hoists, context) {
      if (!hoists.length) {
          return;
      }
      context.newline();
      hoists.forEach((exp, i) => {
          context.push(`const _hoisted_${i + 1} = `);
          genNode(exp, context);
          context.newline();
      });
  }
  function isText(n) {
      return (isString(n) ||
          n.type === 4 /* SIMPLE_EXPRESSION */ ||
          n.type === 2 /* TEXT */ ||
          n.type === 5 /* INTERPOLATION */ ||
          n.type === 8 /* COMPOUND_EXPRESSION */);
  }
  function genNodeListAsArray(nodes, context) {
      const multilines = nodes.length > 3 ||
          ( nodes.some(n => isArray(n) || !isText(n)));
      context.push(`[`);
      multilines && context.indent();
      genNodeList(nodes, context, multilines);
      multilines && context.deindent();
      context.push(`]`);
  }
  function genNodeList(nodes, context, multilines = false) {
      const { push, newline } = context;
      for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          if (isString(node)) {
              push(node);
          }
          else if (isArray(node)) {
              genNodeListAsArray(node, context);
          }
          else {
              genNode(node, context);
          }
          if (i < nodes.length - 1) {
              if (multilines) {
                  push(',');
                  newline();
              }
              else {
                  push(', ');
              }
          }
      }
  }
  function genNode(node, context) {
      if (isString(node)) {
          context.push(node);
          return;
      }
      if (isSymbol(node)) {
          context.push(context.helper(node));
          return;
      }
      switch (node.type) {
          case 1 /* ELEMENT */:
          case 9 /* IF */:
          case 11 /* FOR */:
              
                  assert(node.codegenNode != null, `Codegen node is missing for element/if/for node. ` +
                      `Apply appropriate transforms first.`);
              genNode(node.codegenNode, context);
              break;
          case 2 /* TEXT */:
              genText(node, context);
              break;
          case 4 /* SIMPLE_EXPRESSION */:
              genExpression(node, context);
              break;
          case 5 /* INTERPOLATION */:
              genInterpolation(node, context);
              break;
          case 8 /* COMPOUND_EXPRESSION */:
              genCompoundExpression(node, context);
              break;
          case 3 /* COMMENT */:
              genComment(node, context);
              break;
          case 12 /* JS_CALL_EXPRESSION */:
              genCallExpression(node, context);
              break;
          case 13 /* JS_OBJECT_EXPRESSION */:
              genObjectExpression(node, context);
              break;
          case 15 /* JS_ARRAY_EXPRESSION */:
              genArrayExpression(node, context);
              break;
          case 16 /* JS_FUNCTION_EXPRESSION */:
              genFunctionExpression(node, context);
              break;
          case 17 /* JS_SEQUENCE_EXPRESSION */:
              genSequenceExpression(node, context);
              break;
          case 18 /* JS_CONDITIONAL_EXPRESSION */:
              genConditionalExpression(node, context);
              break;
          /* istanbul ignore next */
          default:
              {
                  assert(false, `unhandled codegen node type: ${node.type}`);
                  // make sure we exhaust all possible types
                  const exhaustiveCheck = node;
                  return exhaustiveCheck;
              }
      }
  }
  function genText(node, context) {
      context.push(JSON.stringify(node.content), node);
  }
  function genExpression(node, context) {
      const { content, isStatic } = node;
      context.push(isStatic ? JSON.stringify(content) : content, node);
  }
  function genInterpolation(node, context) {
      const { push, helper } = context;
      push(`${helper(TO_STRING)}(`);
      genNode(node.content, context);
      push(`)`);
  }
  function genCompoundExpression(node, context) {
      for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i];
          if (isString(child)) {
              context.push(child);
          }
          else {
              genNode(child, context);
          }
      }
  }
  function genExpressionAsPropertyKey(node, context) {
      const { push } = context;
      if (node.type === 8 /* COMPOUND_EXPRESSION */) {
          push(`[`);
          genCompoundExpression(node, context);
          push(`]`);
      }
      else if (node.isStatic) {
          // only quote keys if necessary
          const text = isSimpleIdentifier(node.content)
              ? node.content
              : JSON.stringify(node.content);
          push(text, node);
      }
      else {
          push(`[${node.content}]`, node);
      }
  }
  function genComment(node, context) {
      {
          const { push, helper } = context;
          push(`${helper(CREATE_VNODE)}(${helper(COMMENT)}, 0, ${JSON.stringify(node.content)})`, node);
      }
  }
  // JavaScript
  function genCallExpression(node, context) {
      const callee = isString(node.callee)
          ? node.callee
          : context.helper(node.callee);
      context.push(callee + `(`, node, true);
      genNodeList(node.arguments, context);
      context.push(`)`);
  }
  function genObjectExpression(node, context) {
      const { push, indent, deindent, newline, resetMapping } = context;
      const { properties } = node;
      if (!properties.length) {
          push(`{}`, node);
          return;
      }
      const multilines = properties.length > 1 ||
          (
              properties.some(p => p.value.type !== 4 /* SIMPLE_EXPRESSION */));
      push(multilines ? `{` : `{ `);
      multilines && indent();
      for (let i = 0; i < properties.length; i++) {
          const { key, value, loc } = properties[i];
          resetMapping(loc); // reset source mapping for every property.
          // key
          genExpressionAsPropertyKey(key, context);
          push(`: `);
          // value
          genNode(value, context);
          if (i < properties.length - 1) {
              // will only reach this if it's multilines
              push(`,`);
              newline();
          }
      }
      multilines && deindent();
      const lastChar = context.code[context.code.length - 1];
      push(multilines || /[\])}]/.test(lastChar) ? `}` : ` }`);
  }
  function genArrayExpression(node, context) {
      genNodeListAsArray(node.elements, context);
  }
  function genFunctionExpression(node, context) {
      const { push, indent, deindent } = context;
      const { params, returns, newline } = node;
      push(`(`, node);
      if (isArray(params)) {
          genNodeList(params, context);
      }
      else if (params) {
          genNode(params, context);
      }
      push(`) => `);
      if (newline) {
          push(`{`);
          indent();
          push(`return `);
      }
      if (isArray(returns)) {
          genNodeListAsArray(returns, context);
      }
      else {
          genNode(returns, context);
      }
      if (newline) {
          deindent();
          push(`}`);
      }
  }
  function genConditionalExpression(node, context) {
      const { test, consequent, alternate } = node;
      const { push, indent, deindent, newline } = context;
      if (test.type === 4 /* SIMPLE_EXPRESSION */) {
          const needsParens = !isSimpleIdentifier(test.content);
          needsParens && push(`(`);
          genExpression(test, context);
          needsParens && push(`)`);
      }
      else {
          push(`(`);
          genCompoundExpression(test, context);
          push(`)`);
      }
      indent();
      context.indentLevel++;
      push(`? `);
      genNode(consequent, context);
      context.indentLevel--;
      newline();
      push(`: `);
      const isNested = alternate.type === 18 /* JS_CONDITIONAL_EXPRESSION */;
      if (!isNested) {
          context.indentLevel++;
      }
      genNode(alternate, context);
      if (!isNested) {
          context.indentLevel--;
      }
      deindent(true /* without newline */);
  }
  function genSequenceExpression(node, context) {
      context.push(`(`);
      genNodeList(node.expressions, context);
      context.push(`)`);
  }

  const transformExpression = (node, context) => {
      if (node.type === 5 /* INTERPOLATION */) {
          node.content = processExpression(node.content, context);
      }
      else if (node.type === 1 /* ELEMENT */) {
          // handle directives on element
          for (let i = 0; i < node.props.length; i++) {
              const dir = node.props[i];
              // do not process for v-on & v-for since they are special handled
              if (dir.type === 7 /* DIRECTIVE */ && dir.name !== 'for') {
                  const exp = dir.exp;
                  const arg = dir.arg;
                  // do not process exp if this is v-on:arg - we need special handling
                  // for wrapping inline statements.
                  if (exp && !(dir.name === 'on' && arg)) {
                      dir.exp = processExpression(exp, context, 
                      // slot args must be processed as function params
                      dir.name === 'slot');
                  }
                  if (arg && !arg.isStatic) {
                      dir.arg = processExpression(arg, context);
                  }
              }
          }
      }
  };
  // Important: since this function uses Node.js only dependencies, it should
  // always be used with a leading !false check so that it can be
  // tree-shaken from the browser build.
  function processExpression(node, context, 
  // some expressions like v-slot props & v-for aliases should be parsed as
  // function params
  asParams = false) {
      if (!context.prefixIdentifiers) {
          return node;
      }
      // fast path if expression is a simple identifier.
      if (isSimpleIdentifier(node.content)) {
          if (!asParams && !context.identifiers[node.content]) {
              node.content = `_ctx.${node.content}`;
          }
          return node;
      }
      let ast;
      // if the expression is supposed to be used in a function params position
      // we need to parse it differently.
      const source = `(${node.content})${asParams ? `=>{}` : ``}`;
      try {
          ast = parseJS(source, { ranges: true });
      }
      catch (e) {
          context.onError(e);
          return node;
      }
      const ids = [];
      const knownIds = Object.create(context.identifiers);
      // walk the AST and look for identifiers that need to be prefixed with `_ctx.`.
      walkJS(ast, {
          enter(node, parent) {
              if (node.type === 'Identifier') {
                  if (!ids.includes(node)) {
                      if (!knownIds[node.name] && shouldPrefix(node, parent)) {
                          if (isPropertyShorthand(node, parent)) {
                              // property shorthand like { foo }, we need to add the key since we
                              // rewrite the value
                              node.prefix = `${node.name}: `;
                          }
                          node.name = `_ctx.${node.name}`;
                          ids.push(node);
                      }
                      else if (!isStaticPropertyKey(node, parent)) {
                          // also generate sub-expressions for other identifiers for better
                          // source map support. (except for property keys which are static)
                          ids.push(node);
                      }
                  }
              }
              else if (isFunction$1(node)) {
                  // walk function expressions and add its arguments to known identifiers
                  // so that we don't prefix them
                  node.params.forEach(p => walkJS(p, {
                      enter(child, parent) {
                          if (child.type === 'Identifier' &&
                              // do not record as scope variable if is a destructured key
                              !isStaticPropertyKey(child, parent) &&
                              // do not record if this is a default value
                              // assignment of a destructured variable
                              !(parent &&
                                  parent.type === 'AssignmentPattern' &&
                                  parent.right === child)) {
                              const { name } = child;
                              if (node._scopeIds &&
                                  node._scopeIds.has(name)) {
                                  return;
                              }
                              if (name in knownIds) {
                                  knownIds[name]++;
                              }
                              else {
                                  knownIds[name] = 1;
                              }
                              (node._scopeIds ||
                                  (node._scopeIds = new Set())).add(name);
                          }
                      }
                  }));
              }
          },
          leave(node) {
              if (node !== ast.body[0].expression && node._scopeIds) {
                  node._scopeIds.forEach((id) => {
                      knownIds[id]--;
                      if (knownIds[id] === 0) {
                          delete knownIds[id];
                      }
                  });
              }
          }
      });
      // We break up the compound expression into an array of strings and sub
      // expressions (for identifiers that have been prefixed). In codegen, if
      // an ExpressionNode has the `.children` property, it will be used instead of
      // `.content`.
      const full = node.content;
      const children = [];
      ids.sort((a, b) => a.start - b.start);
      ids.forEach((id, i) => {
          // range is offset by -1 due to the wrapping parens when parsed
          const start = id.start - 1;
          const end = id.end - 1;
          const last = ids[i - 1];
          const leadingText = full.slice(last ? last.end - 1 : 0, start);
          if (leadingText.length || id.prefix) {
              children.push(leadingText + (id.prefix || ``));
          }
          const source = full.slice(start, end);
          children.push(createSimpleExpression(id.name, false, {
              source,
              start: advancePositionWithClone(node.loc.start, source, start),
              end: advancePositionWithClone(node.loc.start, source, end)
          }));
          if (i === ids.length - 1 && end < full.length) {
              children.push(full.slice(end));
          }
      });
      let ret;
      if (children.length) {
          ret = createCompoundExpression(children);
      }
      else {
          ret = node;
      }
      ret.identifiers = Object.keys(knownIds);
      return ret;
  }
  const isFunction$1 = (node) => /Function(Expression|Declaration)$/.test(node.type);
  const isPropertyKey = (node, parent) => parent &&
      parent.type === 'Property' &&
      parent.key === node &&
      !parent.computed;
  const isPropertyShorthand = (node, parent) => isPropertyKey(node, parent) && parent.value === node;
  const isStaticPropertyKey = (node, parent) => isPropertyKey(node, parent) && parent.value !== node;
  function shouldPrefix(identifier, parent) {
      if (!(isFunction$1(parent) &&
          // not id of a FunctionDeclaration
          (parent.id === identifier ||
              // not a params of a function
              parent.params.includes(identifier))) &&
          // not a key of Property
          !isStaticPropertyKey(identifier, parent) &&
          // not a property of a MemberExpression
          !(parent.type === 'MemberExpression' &&
              parent.property === identifier &&
              !parent.computed) &&
          // not in an Array destructure pattern
          !(parent.type === 'ArrayPattern') &&
          // skip whitelisted globals
          !globalsWhitelist.has(identifier.name) &&
          // special case for webpack compilation
          identifier.name !== `require` &&
          // is a special keyword but parsed as identifier
          identifier.name !== `arguments`) {
          return true;
      }
  }

  const transformIf = createStructuralDirectiveTransform(/^(if|else|else-if)$/, (node, dir, context) => {
      if (dir.name !== 'else' &&
          (!dir.exp || !dir.exp.content.trim())) {
          const loc = dir.exp ? dir.exp.loc : node.loc;
          context.onError(createCompilerError(35 /* X_IF_NO_EXPRESSION */, dir.loc));
          dir.exp = createSimpleExpression(`true`, false, loc);
      }
      if ( context.prefixIdentifiers && dir.exp) {
          // dir.exp can only be simple expression because vIf transform is applied
          // before expression transform.
          dir.exp = processExpression(dir.exp, context);
      }
      if (dir.name === 'if') {
          const branch = createIfBranch(node, dir);
          const codegenNode = createSequenceExpression([
              createCallExpression(context.helper(OPEN_BLOCK))
          ]);
          context.replaceNode({
              type: 9 /* IF */,
              loc: node.loc,
              branches: [branch],
              codegenNode
          });
          // Exit callback. Complete the codegenNode when all children have been
          // transformed.
          return () => {
              codegenNode.expressions.push(createCodegenNodeForBranch(branch, 0, context));
          };
      }
      else {
          // locate the adjacent v-if
          const siblings = context.parent.children;
          const comments = [];
          let i = siblings.indexOf(node);
          while (i-- >= -1) {
              const sibling = siblings[i];
              if ( sibling && sibling.type === 3 /* COMMENT */) {
                  context.removeNode(sibling);
                  comments.unshift(sibling);
                  continue;
              }
              if (sibling && sibling.type === 9 /* IF */) {
                  // move the node to the if node's branches
                  context.removeNode();
                  const branch = createIfBranch(node, dir);
                  if ( comments.length) {
                      branch.children = [...comments, ...branch.children];
                  }
                  sibling.branches.push(branch);
                  // since the branch was removed, it will not be traversed.
                  // make sure to traverse here.
                  traverseChildren(branch, context);
                  // make sure to reset currentNode after traversal to indicate this
                  // node has been removed.
                  context.currentNode = null;
                  // attach this branch's codegen node to the v-if root.
                  let parentCondition = sibling.codegenNode
                      .expressions[1];
                  while (true) {
                      if (parentCondition.alternate.type ===
                          18 /* JS_CONDITIONAL_EXPRESSION */) {
                          parentCondition = parentCondition.alternate;
                      }
                      else {
                          parentCondition.alternate = createCodegenNodeForBranch(branch, sibling.branches.length - 1, context);
                          break;
                      }
                  }
              }
              else {
                  context.onError(createCompilerError(36 /* X_ELSE_NO_ADJACENT_IF */, node.loc));
              }
              break;
          }
      }
  });
  function createIfBranch(node, dir) {
      return {
          type: 10 /* IF_BRANCH */,
          loc: node.loc,
          condition: dir.name === 'else' ? undefined : dir.exp,
          children: node.tagType === 3 /* TEMPLATE */ ? node.children : [node]
      };
  }
  function createCodegenNodeForBranch(branch, index, context) {
      if (branch.condition) {
          return createConditionalExpression(branch.condition, createChildrenCodegenNode(branch, index, context), createCallExpression(context.helper(CREATE_BLOCK), [
              context.helper(EMPTY)
          ]));
      }
      else {
          return createChildrenCodegenNode(branch, index, context);
      }
  }
  function createChildrenCodegenNode(branch, index, context) {
      const { helper } = context;
      const keyProperty = createObjectProperty(`key`, createSimpleExpression(index + '', false));
      const { children } = branch;
      const child = children[0];
      const needFragmentWrapper = children.length !== 1 || child.type !== 1 /* ELEMENT */;
      if (needFragmentWrapper) {
          const blockArgs = [
              helper(FRAGMENT),
              createObjectExpression([keyProperty]),
              children
          ];
          if (children.length === 1 && child.type === 11 /* FOR */) {
              // optimize away nested fragments when child is a ForNode
              const forBlockArgs = child.codegenNode.expressions[1].arguments;
              // directly use the for block's children and patchFlag
              blockArgs[2] = forBlockArgs[2];
              blockArgs[3] = forBlockArgs[3];
          }
          return createCallExpression(helper(CREATE_BLOCK), blockArgs);
      }
      else {
          const childCodegen = child.codegenNode;
          let vnodeCall = childCodegen;
          // Element with custom directives. Locate the actual createVNode() call.
          if (vnodeCall.callee === APPLY_DIRECTIVES) {
              vnodeCall = vnodeCall.arguments[0];
          }
          // Change createVNode to createBlock.
          if (vnodeCall.callee === CREATE_VNODE) {
              vnodeCall.callee = helper(CREATE_BLOCK);
          }
          // It's possible to have renderSlot() here as well - which already produces
          // a block, so no need to change the callee. However it accepts props at
          // a different arg index so make sure to check for so that the key injection
          // logic below works for it too.
          const propsIndex = vnodeCall.callee === RENDER_SLOT ? 2 : 1;
          // inject branch key
          const existingProps = vnodeCall.arguments[propsIndex];
          vnodeCall.arguments[propsIndex] = injectProp(existingProps, keyProperty, context);
          return childCodegen;
      }
  }

  const transformFor = createStructuralDirectiveTransform('for', (node, dir, context) => {
      if (dir.exp) {
          const parseResult = parseForExpression(
          // can only be simple expression because vFor transform is applied
          // before expression transform.
          dir.exp, context);
          if (parseResult) {
              const { helper, addIdentifiers, removeIdentifiers, scopes } = context;
              const { source, value, key, index } = parseResult;
              // create the loop render function expression now, and add the
              // iterator on exit after all children have been traversed
              const renderExp = createCallExpression(helper(RENDER_LIST), [source]);
              const keyProp = findProp(node, `key`);
              const fragmentFlag = keyProp
                  ? 64 /* KEYED_FRAGMENT */
                  : 128 /* UNKEYED_FRAGMENT */;
              const codegenNode = createSequenceExpression([
                  createCallExpression(helper(OPEN_BLOCK)),
                  createCallExpression(helper(CREATE_BLOCK), [
                      helper(FRAGMENT),
                      `null`,
                      renderExp,
                      fragmentFlag +
                          ( ` /* ${PatchFlagNames[fragmentFlag]} */` )
                  ])
              ]);
              context.replaceNode({
                  type: 11 /* FOR */,
                  loc: dir.loc,
                  source,
                  valueAlias: value,
                  keyAlias: key,
                  objectIndexAlias: index,
                  children: node.tagType === 3 /* TEMPLATE */ ? node.children : [node],
                  codegenNode
              });
              // bookkeeping
              scopes.vFor++;
              if ( context.prefixIdentifiers) {
                  // scope management
                  // inject identifiers to context
                  value && addIdentifiers(value);
                  key && addIdentifiers(key);
                  index && addIdentifiers(index);
              }
              return () => {
                  scopes.vFor--;
                  if ( context.prefixIdentifiers) {
                      value && removeIdentifiers(value);
                      key && removeIdentifiers(key);
                      index && removeIdentifiers(index);
                  }
                  // finish the codegen now that all children have been traversed
                  let childBlock;
                  const isTemplate = isTemplateNode(node);
                  const slotOutlet = isSlotOutlet(node)
                      ? node
                      : isTemplate &&
                          node.children.length === 1 &&
                          isSlotOutlet(node.children[0])
                          ? node.children[0]
                          : null;
                  const keyProperty = keyProp
                      ? createObjectProperty(`key`, keyProp.type === 6 /* ATTRIBUTE */
                          ? createSimpleExpression(keyProp.value.content, true)
                          : keyProp.exp)
                      : null;
                  if (slotOutlet) {
                      // <slot v-for="..."> or <template v-for="..."><slot/></template>
                      childBlock = slotOutlet.codegenNode;
                      if (isTemplate && keyProperty) {
                          // <template v-for="..." :key="..."><slot/></template>
                          // we need to inject the key to the renderSlot() call.
                          // the props for renderSlot is passed as the 3rd argument.
                          const existingProps = childBlock.arguments[2];
                          childBlock.arguments[2] = injectProp(existingProps, keyProperty, context);
                      }
                  }
                  else if (isTemplate) {
                      // <template v-for="...">
                      // should generate a fragment block for each loop
                      childBlock = createBlockExpression([
                          helper(FRAGMENT),
                          keyProperty ? createObjectExpression([keyProperty]) : `null`,
                          node.children
                      ], context);
                  }
                  else {
                      // Normal element v-for. Directly use the child's codegenNode
                      // arguments, but replace createVNode() with createBlock()
                      childBlock = createBlockExpression(node.codegenNode.arguments, context);
                  }
                  renderExp.arguments.push(createFunctionExpression(createForLoopParams(parseResult), childBlock, true /* force newline */));
              };
          }
          else {
              context.onError(createCompilerError(38 /* X_FOR_MALFORMED_EXPRESSION */, dir.loc));
          }
      }
      else {
          context.onError(createCompilerError(37 /* X_FOR_NO_EXPRESSION */, dir.loc));
      }
  });
  const forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/;
  // This regex doesn't cover the case if key or index aliases have destructuring,
  // but those do not make sense in the first place, so this works in practice.
  const forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/;
  const stripParensRE = /^\(|\)$/g;
  function parseForExpression(input, context) {
      const loc = input.loc;
      const exp = input.content;
      const inMatch = exp.match(forAliasRE);
      if (!inMatch)
          return;
      const [, LHS, RHS] = inMatch;
      const result = {
          source: createAliasExpression(loc, RHS.trim(), exp.indexOf(RHS, LHS.length)),
          value: undefined,
          key: undefined,
          index: undefined
      };
      if ( context.prefixIdentifiers) {
          result.source = processExpression(result.source, context);
      }
      let valueContent = LHS.trim()
          .replace(stripParensRE, '')
          .trim();
      const trimmedOffset = LHS.indexOf(valueContent);
      const iteratorMatch = valueContent.match(forIteratorRE);
      if (iteratorMatch) {
          valueContent = valueContent.replace(forIteratorRE, '').trim();
          const keyContent = iteratorMatch[1].trim();
          let keyOffset;
          if (keyContent) {
              keyOffset = exp.indexOf(keyContent, trimmedOffset + valueContent.length);
              result.key = createAliasExpression(loc, keyContent, keyOffset);
              if ( context.prefixIdentifiers) {
                  result.key = processExpression(result.key, context, true);
              }
          }
          if (iteratorMatch[2]) {
              const indexContent = iteratorMatch[2].trim();
              if (indexContent) {
                  result.index = createAliasExpression(loc, indexContent, exp.indexOf(indexContent, result.key
                      ? keyOffset + keyContent.length
                      : trimmedOffset + valueContent.length));
                  if ( context.prefixIdentifiers) {
                      result.index = processExpression(result.index, context, true);
                  }
              }
          }
      }
      if (valueContent) {
          result.value = createAliasExpression(loc, valueContent, trimmedOffset);
          if ( context.prefixIdentifiers) {
              result.value = processExpression(result.value, context, true);
          }
      }
      return result;
  }
  function createAliasExpression(range, content, offset) {
      return createSimpleExpression(content, false, getInnerRange(range, offset, content.length));
  }
  function createForLoopParams({ value, key, index }) {
      const params = [];
      if (value) {
          params.push(value);
      }
      if (key) {
          if (!value) {
              params.push(createSimpleExpression(`_`, false));
          }
          params.push(key);
      }
      if (index) {
          if (!key) {
              if (!value) {
                  params.push(createSimpleExpression(`_`, false));
              }
              params.push(createSimpleExpression(`__`, false));
          }
          params.push(index);
      }
      return params;
  }

  const isStaticExp = (p) => p.type === 4 /* SIMPLE_EXPRESSION */ && p.isStatic;
  const defaultFallback = createSimpleExpression(`undefined`, false);
  // A NodeTransform that:
  // 1. Tracks scope identifiers for scoped slots so that they don't get prefixed
  //    by transformExpression. This is only applied in non-browser builds with
  //    { prefixIdentifiers: true }.
  // 2. Track v-slot depths so that we know a slot is inside another slot.
  //    Note the exit callback is executed before buildSlots() on the same node,
  //    so only nested slots see positive numbers.
  const trackSlotScopes = (node, context) => {
      if (node.type === 1 /* ELEMENT */ &&
          (node.tagType === 1 /* COMPONENT */ ||
              node.tagType === 3 /* TEMPLATE */)) {
          // We are only checking non-empty v-slot here
          // since we only care about slots that introduce scope variables.
          const vSlot = findDir(node, 'slot');
          if (vSlot) {
              const slotProps = vSlot.exp;
              if ( context.prefixIdentifiers) {
                  slotProps && context.addIdentifiers(slotProps);
              }
              context.scopes.vSlot++;
              return () => {
                  if ( context.prefixIdentifiers) {
                      slotProps && context.removeIdentifiers(slotProps);
                  }
                  context.scopes.vSlot--;
              };
          }
      }
  };
  // A NodeTransform that tracks scope identifiers for scoped slots with v-for.
  // This transform is only applied in non-browser builds with { prefixIdentifiers: true }
  const trackVForSlotScopes = (node, context) => {
      let vFor;
      if (isTemplateNode(node) &&
          node.props.some(isVSlot) &&
          (vFor = findDir(node, 'for'))) {
          const result = (vFor.parseResult = parseForExpression(vFor.exp, context));
          if (result) {
              const { value, key, index } = result;
              const { addIdentifiers, removeIdentifiers } = context;
              value && addIdentifiers(value);
              key && addIdentifiers(key);
              index && addIdentifiers(index);
              return () => {
                  value && removeIdentifiers(value);
                  key && removeIdentifiers(key);
                  index && removeIdentifiers(index);
              };
          }
      }
  };
  // Instead of being a DirectiveTransform, v-slot processing is called during
  // transformElement to build the slots object for a component.
  function buildSlots(node, context) {
      const { children, loc } = node;
      const slotsProperties = [];
      const dynamicSlots = [];
      // If the slot is inside a v-for or another v-slot, force it to be dynamic
      // since it likely uses a scope variable.
      // TODO: This can be further optimized to only make it dynamic when the slot
      // actually uses the scope variables.
      let hasDynamicSlots = context.scopes.vSlot > 0 || context.scopes.vFor > 0;
      // 1. Check for default slot with slotProps on component itself.
      //    <Comp v-slot="{ prop }"/>
      const explicitDefaultSlot = findDir(node, 'slot', true);
      if (explicitDefaultSlot) {
          const { arg, exp, loc } = explicitDefaultSlot;
          if (arg) {
              context.onError(createCompilerError(42 /* X_NAMED_SLOT_ON_COMPONENT */, loc));
          }
          slotsProperties.push(buildDefaultSlot(exp, children, loc));
      }
      // 2. Iterate through children and check for template slots
      //    <template v-slot:foo="{ prop }">
      let hasTemplateSlots = false;
      let extraneousChild = undefined;
      const seenSlotNames = new Set();
      for (let i = 0; i < children.length; i++) {
          const slotElement = children[i];
          let slotDir;
          if (!isTemplateNode(slotElement) ||
              !(slotDir = findDir(slotElement, 'slot', true))) {
              // not a <template v-slot>, skip.
              if (slotElement.type !== 3 /* COMMENT */ && !extraneousChild) {
                  extraneousChild = slotElement;
              }
              continue;
          }
          if (explicitDefaultSlot) {
              // already has on-component default slot - this is incorrect usage.
              context.onError(createCompilerError(43 /* X_MIXED_SLOT_USAGE */, slotDir.loc));
              break;
          }
          hasTemplateSlots = true;
          const { children: slotChildren, loc: slotLoc } = slotElement;
          const { arg: slotName = createSimpleExpression(`default`, true), exp: slotProps, loc: dirLoc } = slotDir;
          // check if name is dynamic.
          let staticSlotName;
          if (isStaticExp(slotName)) {
              staticSlotName = slotName ? slotName.content : `default`;
          }
          else {
              hasDynamicSlots = true;
          }
          const slotFunction = createFunctionExpression(slotProps, slotChildren, false, slotChildren.length ? slotChildren[0].loc : slotLoc);
          // check if this slot is conditional (v-if/v-for)
          let vIf;
          let vElse;
          let vFor;
          if ((vIf = findDir(slotElement, 'if'))) {
              hasDynamicSlots = true;
              dynamicSlots.push(createConditionalExpression(vIf.exp, buildDynamicSlot(slotName, slotFunction), defaultFallback));
          }
          else if ((vElse = findDir(slotElement, /^else(-if)?$/, true /* allowEmpty */))) {
              // find adjacent v-if
              let j = i;
              let prev;
              while (j--) {
                  prev = children[j];
                  if (prev.type !== 3 /* COMMENT */) {
                      break;
                  }
              }
              if (prev && isTemplateNode(prev) && findDir(prev, 'if')) {
                  // remove node
                  children.splice(i, 1);
                  i--;
                   assert(dynamicSlots.length > 0);
                  // attach this slot to previous conditional
                  let conditional = dynamicSlots[dynamicSlots.length - 1];
                  while (conditional.alternate.type === 18 /* JS_CONDITIONAL_EXPRESSION */) {
                      conditional = conditional.alternate;
                  }
                  conditional.alternate = vElse.exp
                      ? createConditionalExpression(vElse.exp, buildDynamicSlot(slotName, slotFunction), defaultFallback)
                      : buildDynamicSlot(slotName, slotFunction);
              }
              else {
                  context.onError(createCompilerError(36 /* X_ELSE_NO_ADJACENT_IF */, vElse.loc));
              }
          }
          else if ((vFor = findDir(slotElement, 'for'))) {
              hasDynamicSlots = true;
              const parseResult = vFor.parseResult ||
                  parseForExpression(vFor.exp, context);
              if (parseResult) {
                  // Render the dynamic slots as an array and add it to the createSlot()
                  // args. The runtime knows how to handle it appropriately.
                  dynamicSlots.push(createCallExpression(context.helper(RENDER_LIST), [
                      parseResult.source,
                      createFunctionExpression(createForLoopParams(parseResult), buildDynamicSlot(slotName, slotFunction), true)
                  ]));
              }
              else {
                  context.onError(createCompilerError(38 /* X_FOR_MALFORMED_EXPRESSION */, vFor.loc));
              }
          }
          else {
              // check duplicate static names
              if (staticSlotName) {
                  if (seenSlotNames.has(staticSlotName)) {
                      context.onError(createCompilerError(44 /* X_DUPLICATE_SLOT_NAMES */, dirLoc));
                      continue;
                  }
                  seenSlotNames.add(staticSlotName);
              }
              slotsProperties.push(createObjectProperty(slotName, slotFunction));
          }
      }
      if (hasTemplateSlots && extraneousChild) {
          context.onError(createCompilerError(45 /* X_EXTRANEOUS_NON_SLOT_CHILDREN */, extraneousChild.loc));
      }
      if (!explicitDefaultSlot && !hasTemplateSlots) {
          // implicit default slot.
          slotsProperties.push(buildDefaultSlot(undefined, children, loc));
      }
      let slots = createObjectExpression(slotsProperties.concat(createObjectProperty(`_compiled`, createSimpleExpression(`true`, false))), loc);
      if (dynamicSlots.length) {
          slots = createCallExpression(context.helper(CREATE_SLOTS), [
              slots,
              createArrayExpression(dynamicSlots)
          ]);
      }
      return {
          slots,
          hasDynamicSlots
      };
  }
  function buildDefaultSlot(slotProps, children, loc) {
      return createObjectProperty(`default`, createFunctionExpression(slotProps, children, false, children.length ? children[0].loc : loc));
  }
  function buildDynamicSlot(name, fn) {
      return createObjectExpression([
          createObjectProperty(`name`, name),
          createObjectProperty(`fn`, fn)
      ]);
  }

  // generate a JavaScript AST for this element's codegen
  const transformElement = (node, context) => {
      if (node.type === 1 /* ELEMENT */) {
          if (node.tagType === 0 /* ELEMENT */ ||
              node.tagType === 1 /* COMPONENT */ ||
              // <template> with v-if or v-for are ignored during traversal.
              // <template> without v-slot should be treated as a normal element.
              (node.tagType === 3 /* TEMPLATE */ && !node.props.some(isVSlot))) {
              // perform the work on exit, after all child expressions have been
              // processed and merged.
              return () => {
                  const isComponent = node.tagType === 1 /* COMPONENT */;
                  let hasProps = node.props.length > 0;
                  const hasChildren = node.children.length > 0;
                  let patchFlag = 0;
                  let runtimeDirectives;
                  let dynamicPropNames;
                  if (isComponent) {
                      context.helper(RESOLVE_COMPONENT);
                      context.components.add(node.tag);
                  }
                  const args = [
                      isComponent ? toValidAssetId(node.tag, `component`) : `"${node.tag}"`
                  ];
                  // props
                  if (hasProps) {
                      const propsBuildResult = buildProps(node.props, node.loc, context, isComponent);
                      patchFlag = propsBuildResult.patchFlag;
                      dynamicPropNames = propsBuildResult.dynamicPropNames;
                      runtimeDirectives = propsBuildResult.directives;
                      if (!propsBuildResult.props) {
                          hasProps = false;
                      }
                      else {
                          args.push(propsBuildResult.props);
                      }
                  }
                  // children
                  if (hasChildren) {
                      if (!hasProps) {
                          args.push(`null`);
                      }
                      if (isComponent) {
                          const { slots, hasDynamicSlots } = buildSlots(node, context);
                          args.push(slots);
                          if (hasDynamicSlots) {
                              patchFlag |= 256 /* DYNAMIC_SLOTS */;
                          }
                      }
                      else if (node.children.length === 1) {
                          const child = node.children[0];
                          const type = child.type;
                          const hasDynamicTextChild = type === 5 /* INTERPOLATION */ ||
                              type === 8 /* COMPOUND_EXPRESSION */;
                          if (hasDynamicTextChild) {
                              patchFlag |= 1 /* TEXT */;
                          }
                          // pass directly if the only child is a text node
                          // (plain / interpolation / expression)
                          if (hasDynamicTextChild || type === 2 /* TEXT */) {
                              args.push(child);
                          }
                          else {
                              args.push(node.children);
                          }
                      }
                      else {
                          args.push(node.children);
                      }
                  }
                  // patchFlag & dynamicPropNames
                  if (patchFlag !== 0) {
                      if (!hasChildren) {
                          if (!hasProps) {
                              args.push(`null`);
                          }
                          args.push(`null`);
                      }
                      {
                          const flagNames = Object.keys(PatchFlagNames)
                              .map(Number)
                              .filter(n => n > 0 && patchFlag & n)
                              .map(n => PatchFlagNames[n])
                              .join(`, `);
                          args.push(patchFlag + ` /* ${flagNames} */`);
                      }
                      if (dynamicPropNames && dynamicPropNames.length) {
                          args.push(`[${dynamicPropNames.map(n => JSON.stringify(n)).join(`, `)}]`);
                      }
                  }
                  const { loc } = node;
                  const vnode = createCallExpression(context.helper(CREATE_VNODE), args, loc);
                  if (runtimeDirectives && runtimeDirectives.length) {
                      node.codegenNode = createCallExpression(context.helper(APPLY_DIRECTIVES), [
                          vnode,
                          createArrayExpression(runtimeDirectives.map(dir => {
                              return createDirectiveArgs(dir, context);
                          }), loc)
                      ], loc);
                  }
                  else {
                      node.codegenNode = vnode;
                  }
              };
          }
      }
  };
  function buildProps(props, elementLoc, context, isComponent = false) {
      let properties = [];
      const mergeArgs = [];
      const runtimeDirectives = [];
      // patchFlag analysis
      let patchFlag = 0;
      let hasRef = false;
      let hasClassBinding = false;
      let hasStyleBinding = false;
      let hasDynamicKeys = false;
      const dynamicPropNames = [];
      const analyzePatchFlag = ({ key, value }) => {
          if (key.type === 4 /* SIMPLE_EXPRESSION */ && key.isStatic) {
              if (value.type !== 4 /* SIMPLE_EXPRESSION */ || !value.isStatic) {
                  const name = key.content;
                  if (name === 'ref') {
                      hasRef = true;
                  }
                  else if (name === 'class') {
                      hasClassBinding = true;
                  }
                  else if (name === 'style') {
                      hasStyleBinding = true;
                  }
                  else if (name !== 'key') {
                      dynamicPropNames.push(key.content);
                  }
              }
          }
          else {
              hasDynamicKeys = true;
          }
      };
      for (let i = 0; i < props.length; i++) {
          // static attribute
          const prop = props[i];
          if (prop.type === 6 /* ATTRIBUTE */) {
              const { loc, name, value } = prop;
              if (name === 'ref') {
                  hasRef = true;
              }
              properties.push(createObjectProperty(createSimpleExpression(name, true, getInnerRange(loc, 0, name.length)), createSimpleExpression(value ? value.content : '', true, value ? value.loc : loc)));
          }
          else {
              // directives
              const { name, arg, exp, loc } = prop;
              // skip v-slot - it is handled by its dedicated transform.
              if (name === 'slot') {
                  if (!isComponent) {
                      context.onError(createCompilerError(46 /* X_MISPLACED_V_SLOT */, loc));
                  }
                  continue;
              }
              // special case for v-bind and v-on with no argument
              const isBind = name === 'bind';
              const isOn = name === 'on';
              if (!arg && (isBind || isOn)) {
                  hasDynamicKeys = true;
                  if (exp) {
                      if (properties.length) {
                          mergeArgs.push(createObjectExpression(dedupeProperties(properties), elementLoc));
                          properties = [];
                      }
                      if (isBind) {
                          mergeArgs.push(exp);
                      }
                      else {
                          // v-on="obj" -> toHandlers(obj)
                          mergeArgs.push({
                              type: 12 /* JS_CALL_EXPRESSION */,
                              loc,
                              callee: context.helper(TO_HANDLERS),
                              arguments: [exp]
                          });
                      }
                  }
                  else {
                      context.onError(createCompilerError(isBind
                          ? 39 /* X_V_BIND_NO_EXPRESSION */
                          : 40 /* X_V_ON_NO_EXPRESSION */, loc));
                  }
                  continue;
              }
              const directiveTransform = context.directiveTransforms[name];
              if (directiveTransform) {
                  // has built-in directive transform.
                  const { props, needRuntime } = directiveTransform(prop, context);
                  if (isArray(props)) {
                      properties.push(...props);
                      properties.forEach(analyzePatchFlag);
                  }
                  else {
                      properties.push(props);
                      analyzePatchFlag(props);
                  }
                  if (needRuntime) {
                      runtimeDirectives.push(prop);
                  }
              }
              else {
                  // no built-in transform, this is a user custom directive.
                  runtimeDirectives.push(prop);
              }
          }
      }
      let propsExpression = undefined;
      // has v-bind="object" or v-on="object", wrap with mergeProps
      if (mergeArgs.length) {
          if (properties.length) {
              mergeArgs.push(createObjectExpression(dedupeProperties(properties), elementLoc));
          }
          if (mergeArgs.length > 1) {
              propsExpression = createCallExpression(context.helper(MERGE_PROPS), mergeArgs, elementLoc);
          }
          else {
              // single v-bind with nothing else - no need for a mergeProps call
              propsExpression = mergeArgs[0];
          }
      }
      else if (properties.length) {
          propsExpression = createObjectExpression(dedupeProperties(properties), elementLoc);
      }
      // patchFlag analysis
      if (hasDynamicKeys) {
          patchFlag |= 16 /* FULL_PROPS */;
      }
      else {
          if (hasClassBinding) {
              patchFlag |= 2 /* CLASS */;
          }
          if (hasStyleBinding) {
              patchFlag |= 4 /* STYLE */;
          }
          if (dynamicPropNames.length) {
              patchFlag |= 8 /* PROPS */;
          }
      }
      if (patchFlag === 0 && (hasRef || runtimeDirectives.length > 0)) {
          patchFlag |= 32 /* NEED_PATCH */;
      }
      return {
          props: propsExpression,
          directives: runtimeDirectives,
          patchFlag,
          dynamicPropNames
      };
  }
  // Dedupe props in an object literal.
  // Literal duplicated attributes would have been warned during the parse phase,
  // however, it's possible to encounter duplicated `onXXX` handlers with different
  // modifiers. We also need to merge static and dynamic class / style attributes.
  // - onXXX handlers / style: merge into array
  // - class: merge into single expression with concatenation
  function dedupeProperties(properties) {
      const knownProps = {};
      const deduped = [];
      for (let i = 0; i < properties.length; i++) {
          const prop = properties[i];
          // dynamic keys are always allowed
          if (prop.key.type === 8 /* COMPOUND_EXPRESSION */ || !prop.key.isStatic) {
              deduped.push(prop);
              continue;
          }
          const name = prop.key.content;
          const existing = knownProps[name];
          if (existing) {
              if (name.startsWith('on') || name === 'style' || name === 'class') {
                  mergeAsArray(existing, prop);
              }
              // unexpected duplicate, should have emitted error during parse
          }
          else {
              knownProps[name] = prop;
              deduped.push(prop);
          }
      }
      return deduped;
  }
  function mergeAsArray(existing, incoming) {
      if (existing.value.type === 15 /* JS_ARRAY_EXPRESSION */) {
          existing.value.elements.push(incoming.value);
      }
      else {
          existing.value = createArrayExpression([existing.value, incoming.value], existing.loc);
      }
  }
  function createDirectiveArgs(dir, context) {
      // inject statement for resolving directive
      context.helper(RESOLVE_DIRECTIVE);
      context.directives.add(dir.name);
      const dirArgs = [
          toValidAssetId(dir.name, `directive`)
      ];
      const { loc } = dir;
      if (dir.exp)
          dirArgs.push(dir.exp);
      if (dir.arg)
          dirArgs.push(dir.arg);
      if (Object.keys(dir.modifiers).length) {
          dirArgs.push(createObjectExpression(dir.modifiers.map(modifier => createObjectProperty(modifier, createSimpleExpression(`true`, false, loc))), loc));
      }
      return createArrayExpression(dirArgs, dir.loc);
  }

  const transformSlotOutlet = (node, context) => {
      if (isSlotOutlet(node)) {
          const { props, children, loc } = node;
          const $slots = context.prefixIdentifiers ? `_ctx.$slots` : `$slots`;
          let slotName = `"default"`;
          // check for <slot name="xxx" OR :name="xxx" />
          let nameIndex = -1;
          for (let i = 0; i < props.length; i++) {
              const prop = props[i];
              if (prop.type === 6 /* ATTRIBUTE */) {
                  if (prop.name === `name` && prop.value) {
                      // static name="xxx"
                      slotName = JSON.stringify(prop.value.content);
                      nameIndex = i;
                      break;
                  }
              }
              else if (prop.name === `bind`) {
                  const { arg, exp } = prop;
                  if (arg &&
                      exp &&
                      arg.type === 4 /* SIMPLE_EXPRESSION */ &&
                      arg.isStatic &&
                      arg.content === `name`) {
                      // dynamic :name="xxx"
                      slotName = exp;
                      nameIndex = i;
                      break;
                  }
              }
          }
          const slotArgs = [$slots, slotName];
          const propsWithoutName = nameIndex > -1
              ? props.slice(0, nameIndex).concat(props.slice(nameIndex + 1))
              : props;
          let hasProps = propsWithoutName.length > 0;
          if (hasProps) {
              const { props: propsExpression, directives } = buildProps(propsWithoutName, loc, context);
              if (directives.length) {
                  context.onError(createCompilerError(41 /* X_UNEXPECTED_DIRECTIVE_ON_SLOT_OUTLET */, directives[0].loc));
              }
              if (propsExpression) {
                  slotArgs.push(propsExpression);
              }
              else {
                  hasProps = false;
              }
          }
          if (children.length) {
              if (!hasProps) {
                  slotArgs.push(`{}`);
              }
              slotArgs.push(children);
          }
          node.codegenNode = createCallExpression(context.helper(RENDER_SLOT), slotArgs, loc);
      }
  };

  const fnExpRE = /^([\w$_]+|\([^)]*?\))\s*=>|^function(?:\s+[\w$]+)?\s*\(/;
  const simplePathRE = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\['[^']*?']|\["[^"]*?"]|\[\d+]|\[[A-Za-z_$][\w$]*])*$/;
  // v-on without arg is handled directly in ./element.ts due to it affecting
  // codegen for the entire props object. This transform here is only for v-on
  // *with* args.
  const transformOn = (dir, context) => {
      const { loc, modifiers } = dir;
      const arg = dir.arg;
      if (!dir.exp && !modifiers.length) {
          context.onError(createCompilerError(40 /* X_V_ON_NO_EXPRESSION */, loc));
      }
      let eventName;
      if (arg.type === 4 /* SIMPLE_EXPRESSION */) {
          if (arg.isStatic) {
              eventName = createSimpleExpression(`on${capitalize(arg.content)}`, true, arg.loc);
          }
          else {
              eventName = createCompoundExpression([`"on" + (`, arg, `)`]);
          }
      }
      else {
          // already a compound expression.
          eventName = arg;
          eventName.children.unshift(`"on" + (`);
          eventName.children.push(`)`);
      }
      // TODO .once modifier handling since it is platform agnostic
      // other modifiers are handled in compiler-dom
      // handler processing
      if (dir.exp) {
          // exp is guaranteed to be a simple expression here because v-on w/ arg is
          // skipped by transformExpression as a special case.
          let exp = dir.exp;
          const isInlineStatement = !(simplePathRE.test(exp.content) || fnExpRE.test(exp.content));
          // process the expression since it's been skipped
          if ( context.prefixIdentifiers) {
              context.addIdentifiers(`$event`);
              exp = processExpression(exp, context);
              context.removeIdentifiers(`$event`);
          }
          if (isInlineStatement) {
              // wrap inline statement in a function expression
              exp = createCompoundExpression([
                  `$event => (`,
                  ...(exp.type === 4 /* SIMPLE_EXPRESSION */ ? [exp] : exp.children),
                  `)`
              ]);
          }
          dir.exp = exp;
      }
      return {
          props: createObjectProperty(eventName, dir.exp || createSimpleExpression(`() => {}`, false, loc)),
          needRuntime: false
      };
  };

  // v-bind without arg is handled directly in ./element.ts due to it affecting
  // codegen for the entire props object. This transform here is only for v-bind
  // *with* args.
  const transformBind = (dir, context) => {
      const { exp, modifiers, loc } = dir;
      const arg = dir.arg;
      if (!exp) {
          context.onError(createCompilerError(39 /* X_V_BIND_NO_EXPRESSION */, loc));
      }
      // .prop is no longer necessary due to new patch behavior
      // .sync is replaced by v-model:arg
      if (modifiers.includes('camel')) {
          if (arg.type === 4 /* SIMPLE_EXPRESSION */) {
              if (arg.isStatic) {
                  arg.content = camelize(arg.content);
              }
              else {
                  arg.content = `${context.helperString(CAMELIZE)}(${arg.content})`;
              }
          }
          else {
              arg.children.unshift(`${context.helperString(CAMELIZE)}(`);
              arg.children.push(`)`);
          }
      }
      return {
          props: createObjectProperty(arg, exp || createSimpleExpression('', true, loc)),
          needRuntime: false
      };
  };

  const isText$1 = (node) => node.type === 5 /* INTERPOLATION */ || node.type === 2 /* TEXT */;
  // Merge adjacent text nodes and expressions into a single expression
  // e.g. <div>abc {{ d }} {{ e }}</div> should have a single expression node as child.
  const optimizeText = node => {
      if (node.type === 0 /* ROOT */ || node.type === 1 /* ELEMENT */) {
          // perform the transform on node exit so that all expressions have already
          // been processed.
          return () => {
              const children = node.children;
              let currentContainer = undefined;
              for (let i = 0; i < children.length; i++) {
                  const child = children[i];
                  if (isText$1(child)) {
                      for (let j = i + 1; j < children.length; j++) {
                          const next = children[j];
                          if (isText$1(next)) {
                              if (!currentContainer) {
                                  currentContainer = children[i] = {
                                      type: 8 /* COMPOUND_EXPRESSION */,
                                      loc: child.loc,
                                      children: [child]
                                  };
                              }
                              // merge adjacent text node into current
                              currentContainer.children.push(` + `, next);
                              children.splice(j, 1);
                              j--;
                          }
                          else {
                              currentContainer = undefined;
                              break;
                          }
                      }
                  }
              }
          };
      }
  };

  // we name it `baseCompile` so that higher order compilers like @vue/compiler-dom
  // can export `compile` while re-exporting everything else.
  function baseCompile(template, options = {}) {
      const ast = isString(template) ? parse(template, options) : template;
      const prefixIdentifiers = 
          (options.prefixIdentifiers === true || options.mode === 'module');
      transform(ast, {
          ...options,
          prefixIdentifiers,
          nodeTransforms: [
              transformIf,
              transformFor,
              ...(prefixIdentifiers
                  ? [
                      // order is important
                      trackVForSlotScopes,
                      transformExpression
                  ]
                  : []),
              trackSlotScopes,
              optimizeText,
              transformSlotOutlet,
              transformElement,
              ...(options.nodeTransforms || []) // user transforms
          ],
          directiveTransforms: {
              on: transformOn,
              bind: transformBind,
              ...(options.directiveTransforms || {}) // user transforms
          }
      });
      return generate(ast, {
          ...options,
          prefixIdentifiers
      });
  }

  const parserOptionsMinimal = {
      // https://html.spec.whatwg.org/multipage/parsing.html#tree-construction-dispatcher
      getNamespace(tag, parent) {
          let ns = parent ? parent.ns : 0 /* HTML */;
          if (parent && ns === 2 /* MATH_ML */) {
              if (parent.tag === 'annotation-xml') {
                  if (tag === 'svg') {
                      return 1 /* SVG */;
                  }
                  if (parent.props.some(a => a.type === 6 /* ATTRIBUTE */ &&
                      a.name === 'encoding' &&
                      a.value != null &&
                      (a.value.content === 'text/html' ||
                          a.value.content === 'application/xhtml+xml'))) {
                      ns = 0 /* HTML */;
                  }
              }
              else if (/^m(?:[ions]|text)$/.test(parent.tag) &&
                  tag !== 'mglyph' &&
                  tag !== 'malignmark') {
                  ns = 0 /* HTML */;
              }
          }
          else if (parent && ns === 1 /* SVG */) {
              if (parent.tag === 'foreignObject' ||
                  parent.tag === 'desc' ||
                  parent.tag === 'title') {
                  ns = 0 /* HTML */;
              }
          }
          if (ns === 0 /* HTML */) {
              if (tag === 'svg') {
                  return 1 /* SVG */;
              }
              if (tag === 'math') {
                  return 2 /* MATH_ML */;
              }
          }
          return ns;
      },
      // https://html.spec.whatwg.org/multipage/parsing.html#parsing-html-fragments
      getTextMode(tag, ns) {
          if (ns === 0 /* HTML */) {
              if (tag === 'textarea' || tag === 'title') {
                  return 1 /* RCDATA */;
              }
              if (/^(?:style|xmp|iframe|noembed|noframes|script|noscript)$/i.test(tag)) {
                  return 2 /* RAWTEXT */;
              }
          }
          return 0 /* DATA */;
      },
      isVoidTag(tag) {
          return /^(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i.test(tag);
      }
  };

  var namedCharacterReferences = {
  	GT: ">",
  	gt: ">",
  	LT: "<",
  	lt: "<",
  	"ac;": "∾",
  	"af;": "⁡",
  	AMP: "&",
  	amp: "&",
  	"ap;": "≈",
  	"DD;": "ⅅ",
  	"dd;": "ⅆ",
  	deg: "°",
  	"ee;": "ⅇ",
  	"eg;": "⪚",
  	"el;": "⪙",
  	ETH: "Ð",
  	eth: "ð",
  	"gE;": "≧",
  	"ge;": "≥",
  	"Gg;": "⋙",
  	"gg;": "≫",
  	"gl;": "≷",
  	"GT;": ">",
  	"Gt;": "≫",
  	"gt;": ">",
  	"ic;": "⁣",
  	"ii;": "ⅈ",
  	"Im;": "ℑ",
  	"in;": "∈",
  	"it;": "⁢",
  	"lE;": "≦",
  	"le;": "≤",
  	"lg;": "≶",
  	"Ll;": "⋘",
  	"ll;": "≪",
  	"LT;": "<",
  	"Lt;": "≪",
  	"lt;": "<",
  	"mp;": "∓",
  	"Mu;": "Μ",
  	"mu;": "μ",
  	"ne;": "≠",
  	"ni;": "∋",
  	not: "¬",
  	"Nu;": "Ν",
  	"nu;": "ν",
  	"Or;": "⩔",
  	"or;": "∨",
  	"oS;": "Ⓢ",
  	"Pi;": "Π",
  	"pi;": "π",
  	"pm;": "±",
  	"Pr;": "⪻",
  	"pr;": "≺",
  	"Re;": "ℜ",
  	REG: "®",
  	reg: "®",
  	"rx;": "℞",
  	"Sc;": "⪼",
  	"sc;": "≻",
  	shy: "­",
  	uml: "¨",
  	"wp;": "℘",
  	"wr;": "≀",
  	"Xi;": "Ξ",
  	"xi;": "ξ",
  	yen: "¥",
  	"acd;": "∿",
  	"acE;": "∾̳",
  	"Acy;": "А",
  	"acy;": "а",
  	"Afr;": "𝔄",
  	"afr;": "𝔞",
  	"AMP;": "&",
  	"amp;": "&",
  	"And;": "⩓",
  	"and;": "∧",
  	"ang;": "∠",
  	"apE;": "⩰",
  	"ape;": "≊",
  	"ast;": "*",
  	Auml: "Ä",
  	auml: "ä",
  	"Bcy;": "Б",
  	"bcy;": "б",
  	"Bfr;": "𝔅",
  	"bfr;": "𝔟",
  	"bne;": "=⃥",
  	"bot;": "⊥",
  	"Cap;": "⋒",
  	"cap;": "∩",
  	cent: "¢",
  	"Cfr;": "ℭ",
  	"cfr;": "𝔠",
  	"Chi;": "Χ",
  	"chi;": "χ",
  	"cir;": "○",
  	COPY: "©",
  	copy: "©",
  	"Cup;": "⋓",
  	"cup;": "∪",
  	"Dcy;": "Д",
  	"dcy;": "д",
  	"deg;": "°",
  	"Del;": "∇",
  	"Dfr;": "𝔇",
  	"dfr;": "𝔡",
  	"die;": "¨",
  	"div;": "÷",
  	"Dot;": "¨",
  	"dot;": "˙",
  	"Ecy;": "Э",
  	"ecy;": "э",
  	"Efr;": "𝔈",
  	"efr;": "𝔢",
  	"egs;": "⪖",
  	"ell;": "ℓ",
  	"els;": "⪕",
  	"ENG;": "Ŋ",
  	"eng;": "ŋ",
  	"Eta;": "Η",
  	"eta;": "η",
  	"ETH;": "Ð",
  	"eth;": "ð",
  	Euml: "Ë",
  	euml: "ë",
  	"Fcy;": "Ф",
  	"fcy;": "ф",
  	"Ffr;": "𝔉",
  	"ffr;": "𝔣",
  	"gap;": "⪆",
  	"Gcy;": "Г",
  	"gcy;": "г",
  	"gEl;": "⪌",
  	"gel;": "⋛",
  	"geq;": "≥",
  	"ges;": "⩾",
  	"Gfr;": "𝔊",
  	"gfr;": "𝔤",
  	"ggg;": "⋙",
  	"gla;": "⪥",
  	"glE;": "⪒",
  	"glj;": "⪤",
  	"gnE;": "≩",
  	"gne;": "⪈",
  	"Hat;": "^",
  	"Hfr;": "ℌ",
  	"hfr;": "𝔥",
  	"Icy;": "И",
  	"icy;": "и",
  	"iff;": "⇔",
  	"Ifr;": "ℑ",
  	"ifr;": "𝔦",
  	"Int;": "∬",
  	"int;": "∫",
  	Iuml: "Ï",
  	iuml: "ï",
  	"Jcy;": "Й",
  	"jcy;": "й",
  	"Jfr;": "𝔍",
  	"jfr;": "𝔧",
  	"Kcy;": "К",
  	"kcy;": "к",
  	"Kfr;": "𝔎",
  	"kfr;": "𝔨",
  	"lap;": "⪅",
  	"lat;": "⪫",
  	"Lcy;": "Л",
  	"lcy;": "л",
  	"lEg;": "⪋",
  	"leg;": "⋚",
  	"leq;": "≤",
  	"les;": "⩽",
  	"Lfr;": "𝔏",
  	"lfr;": "𝔩",
  	"lgE;": "⪑",
  	"lnE;": "≨",
  	"lne;": "⪇",
  	"loz;": "◊",
  	"lrm;": "‎",
  	"Lsh;": "↰",
  	"lsh;": "↰",
  	macr: "¯",
  	"Map;": "⤅",
  	"map;": "↦",
  	"Mcy;": "М",
  	"mcy;": "м",
  	"Mfr;": "𝔐",
  	"mfr;": "𝔪",
  	"mho;": "℧",
  	"mid;": "∣",
  	"nap;": "≉",
  	nbsp: " ",
  	"Ncy;": "Н",
  	"ncy;": "н",
  	"Nfr;": "𝔑",
  	"nfr;": "𝔫",
  	"ngE;": "≧̸",
  	"nge;": "≱",
  	"nGg;": "⋙̸",
  	"nGt;": "≫⃒",
  	"ngt;": "≯",
  	"nis;": "⋼",
  	"niv;": "∋",
  	"nlE;": "≦̸",
  	"nle;": "≰",
  	"nLl;": "⋘̸",
  	"nLt;": "≪⃒",
  	"nlt;": "≮",
  	"Not;": "⫬",
  	"not;": "¬",
  	"npr;": "⊀",
  	"nsc;": "⊁",
  	"num;": "#",
  	"Ocy;": "О",
  	"ocy;": "о",
  	"Ofr;": "𝔒",
  	"ofr;": "𝔬",
  	"ogt;": "⧁",
  	"ohm;": "Ω",
  	"olt;": "⧀",
  	"ord;": "⩝",
  	ordf: "ª",
  	ordm: "º",
  	"orv;": "⩛",
  	Ouml: "Ö",
  	ouml: "ö",
  	"par;": "∥",
  	para: "¶",
  	"Pcy;": "П",
  	"pcy;": "п",
  	"Pfr;": "𝔓",
  	"pfr;": "𝔭",
  	"Phi;": "Φ",
  	"phi;": "φ",
  	"piv;": "ϖ",
  	"prE;": "⪳",
  	"pre;": "⪯",
  	"Psi;": "Ψ",
  	"psi;": "ψ",
  	"Qfr;": "𝔔",
  	"qfr;": "𝔮",
  	QUOT: "\"",
  	quot: "\"",
  	"Rcy;": "Р",
  	"rcy;": "р",
  	"REG;": "®",
  	"reg;": "®",
  	"Rfr;": "ℜ",
  	"rfr;": "𝔯",
  	"Rho;": "Ρ",
  	"rho;": "ρ",
  	"rlm;": "‏",
  	"Rsh;": "↱",
  	"rsh;": "↱",
  	"scE;": "⪴",
  	"sce;": "⪰",
  	"Scy;": "С",
  	"scy;": "с",
  	sect: "§",
  	"Sfr;": "𝔖",
  	"sfr;": "𝔰",
  	"shy;": "­",
  	"sim;": "∼",
  	"smt;": "⪪",
  	"sol;": "/",
  	"squ;": "□",
  	"Sub;": "⋐",
  	"sub;": "⊂",
  	"Sum;": "∑",
  	"sum;": "∑",
  	"Sup;": "⋑",
  	"sup;": "⊃",
  	sup1: "¹",
  	sup2: "²",
  	sup3: "³",
  	"Tab;": "\t",
  	"Tau;": "Τ",
  	"tau;": "τ",
  	"Tcy;": "Т",
  	"tcy;": "т",
  	"Tfr;": "𝔗",
  	"tfr;": "𝔱",
  	"top;": "⊤",
  	"Ucy;": "У",
  	"ucy;": "у",
  	"Ufr;": "𝔘",
  	"ufr;": "𝔲",
  	"uml;": "¨",
  	Uuml: "Ü",
  	uuml: "ü",
  	"Vcy;": "В",
  	"vcy;": "в",
  	"Vee;": "⋁",
  	"vee;": "∨",
  	"Vfr;": "𝔙",
  	"vfr;": "𝔳",
  	"Wfr;": "𝔚",
  	"wfr;": "𝔴",
  	"Xfr;": "𝔛",
  	"xfr;": "𝔵",
  	"Ycy;": "Ы",
  	"ycy;": "ы",
  	"yen;": "¥",
  	"Yfr;": "𝔜",
  	"yfr;": "𝔶",
  	yuml: "ÿ",
  	"Zcy;": "З",
  	"zcy;": "з",
  	"Zfr;": "ℨ",
  	"zfr;": "𝔷",
  	"zwj;": "‍",
  	Acirc: "Â",
  	acirc: "â",
  	acute: "´",
  	AElig: "Æ",
  	aelig: "æ",
  	"andd;": "⩜",
  	"andv;": "⩚",
  	"ange;": "⦤",
  	"Aopf;": "𝔸",
  	"aopf;": "𝕒",
  	"apid;": "≋",
  	"apos;": "'",
  	Aring: "Å",
  	aring: "å",
  	"Ascr;": "𝒜",
  	"ascr;": "𝒶",
  	"Auml;": "Ä",
  	"auml;": "ä",
  	"Barv;": "⫧",
  	"bbrk;": "⎵",
  	"Beta;": "Β",
  	"beta;": "β",
  	"beth;": "ℶ",
  	"bNot;": "⫭",
  	"bnot;": "⌐",
  	"Bopf;": "𝔹",
  	"bopf;": "𝕓",
  	"boxH;": "═",
  	"boxh;": "─",
  	"boxV;": "║",
  	"boxv;": "│",
  	"Bscr;": "ℬ",
  	"bscr;": "𝒷",
  	"bsim;": "∽",
  	"bsol;": "\\",
  	"bull;": "•",
  	"bump;": "≎",
  	"caps;": "∩︀",
  	"Cdot;": "Ċ",
  	"cdot;": "ċ",
  	cedil: "¸",
  	"cent;": "¢",
  	"CHcy;": "Ч",
  	"chcy;": "ч",
  	"circ;": "ˆ",
  	"cirE;": "⧃",
  	"cire;": "≗",
  	"comp;": "∁",
  	"cong;": "≅",
  	"Copf;": "ℂ",
  	"copf;": "𝕔",
  	"COPY;": "©",
  	"copy;": "©",
  	"Cscr;": "𝒞",
  	"cscr;": "𝒸",
  	"csub;": "⫏",
  	"csup;": "⫐",
  	"cups;": "∪︀",
  	"Darr;": "↡",
  	"dArr;": "⇓",
  	"darr;": "↓",
  	"dash;": "‐",
  	"dHar;": "⥥",
  	"diam;": "⋄",
  	"DJcy;": "Ђ",
  	"djcy;": "ђ",
  	"Dopf;": "𝔻",
  	"dopf;": "𝕕",
  	"Dscr;": "𝒟",
  	"dscr;": "𝒹",
  	"DScy;": "Ѕ",
  	"dscy;": "ѕ",
  	"dsol;": "⧶",
  	"dtri;": "▿",
  	"DZcy;": "Џ",
  	"dzcy;": "џ",
  	"ecir;": "≖",
  	Ecirc: "Ê",
  	ecirc: "ê",
  	"Edot;": "Ė",
  	"eDot;": "≑",
  	"edot;": "ė",
  	"emsp;": " ",
  	"ensp;": " ",
  	"Eopf;": "𝔼",
  	"eopf;": "𝕖",
  	"epar;": "⋕",
  	"epsi;": "ε",
  	"Escr;": "ℰ",
  	"escr;": "ℯ",
  	"Esim;": "⩳",
  	"esim;": "≂",
  	"Euml;": "Ë",
  	"euml;": "ë",
  	"euro;": "€",
  	"excl;": "!",
  	"flat;": "♭",
  	"fnof;": "ƒ",
  	"Fopf;": "𝔽",
  	"fopf;": "𝕗",
  	"fork;": "⋔",
  	"Fscr;": "ℱ",
  	"fscr;": "𝒻",
  	"Gdot;": "Ġ",
  	"gdot;": "ġ",
  	"geqq;": "≧",
  	"gesl;": "⋛︀",
  	"GJcy;": "Ѓ",
  	"gjcy;": "ѓ",
  	"gnap;": "⪊",
  	"gneq;": "⪈",
  	"Gopf;": "𝔾",
  	"gopf;": "𝕘",
  	"Gscr;": "𝒢",
  	"gscr;": "ℊ",
  	"gsim;": "≳",
  	"gtcc;": "⪧",
  	"gvnE;": "≩︀",
  	"half;": "½",
  	"hArr;": "⇔",
  	"harr;": "↔",
  	"hbar;": "ℏ",
  	"Hopf;": "ℍ",
  	"hopf;": "𝕙",
  	"Hscr;": "ℋ",
  	"hscr;": "𝒽",
  	Icirc: "Î",
  	icirc: "î",
  	"Idot;": "İ",
  	"IEcy;": "Е",
  	"iecy;": "е",
  	iexcl: "¡",
  	"imof;": "⊷",
  	"IOcy;": "Ё",
  	"iocy;": "ё",
  	"Iopf;": "𝕀",
  	"iopf;": "𝕚",
  	"Iota;": "Ι",
  	"iota;": "ι",
  	"Iscr;": "ℐ",
  	"iscr;": "𝒾",
  	"isin;": "∈",
  	"Iuml;": "Ï",
  	"iuml;": "ï",
  	"Jopf;": "𝕁",
  	"jopf;": "𝕛",
  	"Jscr;": "𝒥",
  	"jscr;": "𝒿",
  	"KHcy;": "Х",
  	"khcy;": "х",
  	"KJcy;": "Ќ",
  	"kjcy;": "ќ",
  	"Kopf;": "𝕂",
  	"kopf;": "𝕜",
  	"Kscr;": "𝒦",
  	"kscr;": "𝓀",
  	"Lang;": "⟪",
  	"lang;": "⟨",
  	laquo: "«",
  	"Larr;": "↞",
  	"lArr;": "⇐",
  	"larr;": "←",
  	"late;": "⪭",
  	"lcub;": "{",
  	"ldca;": "⤶",
  	"ldsh;": "↲",
  	"leqq;": "≦",
  	"lesg;": "⋚︀",
  	"lHar;": "⥢",
  	"LJcy;": "Љ",
  	"ljcy;": "љ",
  	"lnap;": "⪉",
  	"lneq;": "⪇",
  	"Lopf;": "𝕃",
  	"lopf;": "𝕝",
  	"lozf;": "⧫",
  	"lpar;": "(",
  	"Lscr;": "ℒ",
  	"lscr;": "𝓁",
  	"lsim;": "≲",
  	"lsqb;": "[",
  	"ltcc;": "⪦",
  	"ltri;": "◃",
  	"lvnE;": "≨︀",
  	"macr;": "¯",
  	"male;": "♂",
  	"malt;": "✠",
  	micro: "µ",
  	"mlcp;": "⫛",
  	"mldr;": "…",
  	"Mopf;": "𝕄",
  	"mopf;": "𝕞",
  	"Mscr;": "ℳ",
  	"mscr;": "𝓂",
  	"nang;": "∠⃒",
  	"napE;": "⩰̸",
  	"nbsp;": " ",
  	"ncap;": "⩃",
  	"ncup;": "⩂",
  	"ngeq;": "≱",
  	"nges;": "⩾̸",
  	"ngtr;": "≯",
  	"nGtv;": "≫̸",
  	"nisd;": "⋺",
  	"NJcy;": "Њ",
  	"njcy;": "њ",
  	"nldr;": "‥",
  	"nleq;": "≰",
  	"nles;": "⩽̸",
  	"nLtv;": "≪̸",
  	"nmid;": "∤",
  	"Nopf;": "ℕ",
  	"nopf;": "𝕟",
  	"npar;": "∦",
  	"npre;": "⪯̸",
  	"nsce;": "⪰̸",
  	"Nscr;": "𝒩",
  	"nscr;": "𝓃",
  	"nsim;": "≁",
  	"nsub;": "⊄",
  	"nsup;": "⊅",
  	"ntgl;": "≹",
  	"ntlg;": "≸",
  	"nvap;": "≍⃒",
  	"nvge;": "≥⃒",
  	"nvgt;": ">⃒",
  	"nvle;": "≤⃒",
  	"nvlt;": "<⃒",
  	"oast;": "⊛",
  	"ocir;": "⊚",
  	Ocirc: "Ô",
  	ocirc: "ô",
  	"odiv;": "⨸",
  	"odot;": "⊙",
  	"ogon;": "˛",
  	"oint;": "∮",
  	"omid;": "⦶",
  	"Oopf;": "𝕆",
  	"oopf;": "𝕠",
  	"opar;": "⦷",
  	"ordf;": "ª",
  	"ordm;": "º",
  	"oror;": "⩖",
  	"Oscr;": "𝒪",
  	"oscr;": "ℴ",
  	"osol;": "⊘",
  	"Ouml;": "Ö",
  	"ouml;": "ö",
  	"para;": "¶",
  	"part;": "∂",
  	"perp;": "⊥",
  	"phiv;": "ϕ",
  	"plus;": "+",
  	"Popf;": "ℙ",
  	"popf;": "𝕡",
  	pound: "£",
  	"prap;": "⪷",
  	"prec;": "≺",
  	"prnE;": "⪵",
  	"prod;": "∏",
  	"prop;": "∝",
  	"Pscr;": "𝒫",
  	"pscr;": "𝓅",
  	"qint;": "⨌",
  	"Qopf;": "ℚ",
  	"qopf;": "𝕢",
  	"Qscr;": "𝒬",
  	"qscr;": "𝓆",
  	"QUOT;": "\"",
  	"quot;": "\"",
  	"race;": "∽̱",
  	"Rang;": "⟫",
  	"rang;": "⟩",
  	raquo: "»",
  	"Rarr;": "↠",
  	"rArr;": "⇒",
  	"rarr;": "→",
  	"rcub;": "}",
  	"rdca;": "⤷",
  	"rdsh;": "↳",
  	"real;": "ℜ",
  	"rect;": "▭",
  	"rHar;": "⥤",
  	"rhov;": "ϱ",
  	"ring;": "˚",
  	"Ropf;": "ℝ",
  	"ropf;": "𝕣",
  	"rpar;": ")",
  	"Rscr;": "ℛ",
  	"rscr;": "𝓇",
  	"rsqb;": "]",
  	"rtri;": "▹",
  	"scap;": "⪸",
  	"scnE;": "⪶",
  	"sdot;": "⋅",
  	"sect;": "§",
  	"semi;": ";",
  	"sext;": "✶",
  	"SHcy;": "Ш",
  	"shcy;": "ш",
  	"sime;": "≃",
  	"simg;": "⪞",
  	"siml;": "⪝",
  	"smid;": "∣",
  	"smte;": "⪬",
  	"solb;": "⧄",
  	"Sopf;": "𝕊",
  	"sopf;": "𝕤",
  	"spar;": "∥",
  	"Sqrt;": "√",
  	"squf;": "▪",
  	"Sscr;": "𝒮",
  	"sscr;": "𝓈",
  	"Star;": "⋆",
  	"star;": "☆",
  	"subE;": "⫅",
  	"sube;": "⊆",
  	"succ;": "≻",
  	"sung;": "♪",
  	"sup1;": "¹",
  	"sup2;": "²",
  	"sup3;": "³",
  	"supE;": "⫆",
  	"supe;": "⊇",
  	szlig: "ß",
  	"tbrk;": "⎴",
  	"tdot;": "⃛",
  	THORN: "Þ",
  	thorn: "þ",
  	times: "×",
  	"tint;": "∭",
  	"toea;": "⤨",
  	"Topf;": "𝕋",
  	"topf;": "𝕥",
  	"tosa;": "⤩",
  	"trie;": "≜",
  	"Tscr;": "𝒯",
  	"tscr;": "𝓉",
  	"TScy;": "Ц",
  	"tscy;": "ц",
  	"Uarr;": "↟",
  	"uArr;": "⇑",
  	"uarr;": "↑",
  	Ucirc: "Û",
  	ucirc: "û",
  	"uHar;": "⥣",
  	"Uopf;": "𝕌",
  	"uopf;": "𝕦",
  	"Upsi;": "ϒ",
  	"upsi;": "υ",
  	"Uscr;": "𝒰",
  	"uscr;": "𝓊",
  	"utri;": "▵",
  	"Uuml;": "Ü",
  	"uuml;": "ü",
  	"vArr;": "⇕",
  	"varr;": "↕",
  	"Vbar;": "⫫",
  	"vBar;": "⫨",
  	"Vert;": "‖",
  	"vert;": "|",
  	"Vopf;": "𝕍",
  	"vopf;": "𝕧",
  	"Vscr;": "𝒱",
  	"vscr;": "𝓋",
  	"Wopf;": "𝕎",
  	"wopf;": "𝕨",
  	"Wscr;": "𝒲",
  	"wscr;": "𝓌",
  	"xcap;": "⋂",
  	"xcup;": "⋃",
  	"xmap;": "⟼",
  	"xnis;": "⋻",
  	"Xopf;": "𝕏",
  	"xopf;": "𝕩",
  	"Xscr;": "𝒳",
  	"xscr;": "𝓍",
  	"xvee;": "⋁",
  	"YAcy;": "Я",
  	"yacy;": "я",
  	"YIcy;": "Ї",
  	"yicy;": "ї",
  	"Yopf;": "𝕐",
  	"yopf;": "𝕪",
  	"Yscr;": "𝒴",
  	"yscr;": "𝓎",
  	"YUcy;": "Ю",
  	"yucy;": "ю",
  	"Yuml;": "Ÿ",
  	"yuml;": "ÿ",
  	"Zdot;": "Ż",
  	"zdot;": "ż",
  	"Zeta;": "Ζ",
  	"zeta;": "ζ",
  	"ZHcy;": "Ж",
  	"zhcy;": "ж",
  	"Zopf;": "ℤ",
  	"zopf;": "𝕫",
  	"Zscr;": "𝒵",
  	"zscr;": "𝓏",
  	"zwnj;": "‌",
  	Aacute: "Á",
  	aacute: "á",
  	"Acirc;": "Â",
  	"acirc;": "â",
  	"acute;": "´",
  	"AElig;": "Æ",
  	"aelig;": "æ",
  	Agrave: "À",
  	agrave: "à",
  	"aleph;": "ℵ",
  	"Alpha;": "Α",
  	"alpha;": "α",
  	"Amacr;": "Ā",
  	"amacr;": "ā",
  	"amalg;": "⨿",
  	"angle;": "∠",
  	"angrt;": "∟",
  	"angst;": "Å",
  	"Aogon;": "Ą",
  	"aogon;": "ą",
  	"Aring;": "Å",
  	"aring;": "å",
  	"asymp;": "≈",
  	Atilde: "Ã",
  	atilde: "ã",
  	"awint;": "⨑",
  	"bcong;": "≌",
  	"bdquo;": "„",
  	"bepsi;": "϶",
  	"blank;": "␣",
  	"blk12;": "▒",
  	"blk14;": "░",
  	"blk34;": "▓",
  	"block;": "█",
  	"boxDL;": "╗",
  	"boxDl;": "╖",
  	"boxdL;": "╕",
  	"boxdl;": "┐",
  	"boxDR;": "╔",
  	"boxDr;": "╓",
  	"boxdR;": "╒",
  	"boxdr;": "┌",
  	"boxHD;": "╦",
  	"boxHd;": "╤",
  	"boxhD;": "╥",
  	"boxhd;": "┬",
  	"boxHU;": "╩",
  	"boxHu;": "╧",
  	"boxhU;": "╨",
  	"boxhu;": "┴",
  	"boxUL;": "╝",
  	"boxUl;": "╜",
  	"boxuL;": "╛",
  	"boxul;": "┘",
  	"boxUR;": "╚",
  	"boxUr;": "╙",
  	"boxuR;": "╘",
  	"boxur;": "└",
  	"boxVH;": "╬",
  	"boxVh;": "╫",
  	"boxvH;": "╪",
  	"boxvh;": "┼",
  	"boxVL;": "╣",
  	"boxVl;": "╢",
  	"boxvL;": "╡",
  	"boxvl;": "┤",
  	"boxVR;": "╠",
  	"boxVr;": "╟",
  	"boxvR;": "╞",
  	"boxvr;": "├",
  	"Breve;": "˘",
  	"breve;": "˘",
  	brvbar: "¦",
  	"bsemi;": "⁏",
  	"bsime;": "⋍",
  	"bsolb;": "⧅",
  	"bumpE;": "⪮",
  	"bumpe;": "≏",
  	"caret;": "⁁",
  	"caron;": "ˇ",
  	"ccaps;": "⩍",
  	Ccedil: "Ç",
  	ccedil: "ç",
  	"Ccirc;": "Ĉ",
  	"ccirc;": "ĉ",
  	"ccups;": "⩌",
  	"cedil;": "¸",
  	"check;": "✓",
  	"clubs;": "♣",
  	"Colon;": "∷",
  	"colon;": ":",
  	"comma;": ",",
  	"crarr;": "↵",
  	"Cross;": "⨯",
  	"cross;": "✗",
  	"csube;": "⫑",
  	"csupe;": "⫒",
  	"ctdot;": "⋯",
  	"cuepr;": "⋞",
  	"cuesc;": "⋟",
  	"cupor;": "⩅",
  	curren: "¤",
  	"cuvee;": "⋎",
  	"cuwed;": "⋏",
  	"cwint;": "∱",
  	"Dashv;": "⫤",
  	"dashv;": "⊣",
  	"dblac;": "˝",
  	"ddarr;": "⇊",
  	"Delta;": "Δ",
  	"delta;": "δ",
  	"dharl;": "⇃",
  	"dharr;": "⇂",
  	"diams;": "♦",
  	"disin;": "⋲",
  	divide: "÷",
  	"doteq;": "≐",
  	"dtdot;": "⋱",
  	"dtrif;": "▾",
  	"duarr;": "⇵",
  	"duhar;": "⥯",
  	Eacute: "É",
  	eacute: "é",
  	"Ecirc;": "Ê",
  	"ecirc;": "ê",
  	"eDDot;": "⩷",
  	"efDot;": "≒",
  	Egrave: "È",
  	egrave: "è",
  	"Emacr;": "Ē",
  	"emacr;": "ē",
  	"empty;": "∅",
  	"Eogon;": "Ę",
  	"eogon;": "ę",
  	"eplus;": "⩱",
  	"epsiv;": "ϵ",
  	"eqsim;": "≂",
  	"Equal;": "⩵",
  	"equiv;": "≡",
  	"erarr;": "⥱",
  	"erDot;": "≓",
  	"esdot;": "≐",
  	"exist;": "∃",
  	"fflig;": "ﬀ",
  	"filig;": "ﬁ",
  	"fjlig;": "fj",
  	"fllig;": "ﬂ",
  	"fltns;": "▱",
  	"forkv;": "⫙",
  	frac12: "½",
  	frac14: "¼",
  	frac34: "¾",
  	"frasl;": "⁄",
  	"frown;": "⌢",
  	"Gamma;": "Γ",
  	"gamma;": "γ",
  	"Gcirc;": "Ĝ",
  	"gcirc;": "ĝ",
  	"gescc;": "⪩",
  	"gimel;": "ℷ",
  	"gneqq;": "≩",
  	"gnsim;": "⋧",
  	"grave;": "`",
  	"gsime;": "⪎",
  	"gsiml;": "⪐",
  	"gtcir;": "⩺",
  	"gtdot;": "⋗",
  	"Hacek;": "ˇ",
  	"harrw;": "↭",
  	"Hcirc;": "Ĥ",
  	"hcirc;": "ĥ",
  	"hoarr;": "⇿",
  	Iacute: "Í",
  	iacute: "í",
  	"Icirc;": "Î",
  	"icirc;": "î",
  	"iexcl;": "¡",
  	Igrave: "Ì",
  	igrave: "ì",
  	"iiint;": "∭",
  	"iiota;": "℩",
  	"IJlig;": "Ĳ",
  	"ijlig;": "ĳ",
  	"Imacr;": "Ī",
  	"imacr;": "ī",
  	"image;": "ℑ",
  	"imath;": "ı",
  	"imped;": "Ƶ",
  	"infin;": "∞",
  	"Iogon;": "Į",
  	"iogon;": "į",
  	"iprod;": "⨼",
  	iquest: "¿",
  	"isinE;": "⋹",
  	"isins;": "⋴",
  	"isinv;": "∈",
  	"Iukcy;": "І",
  	"iukcy;": "і",
  	"Jcirc;": "Ĵ",
  	"jcirc;": "ĵ",
  	"jmath;": "ȷ",
  	"Jukcy;": "Є",
  	"jukcy;": "є",
  	"Kappa;": "Κ",
  	"kappa;": "κ",
  	"lAarr;": "⇚",
  	"langd;": "⦑",
  	"laquo;": "«",
  	"larrb;": "⇤",
  	"lates;": "⪭︀",
  	"lBarr;": "⤎",
  	"lbarr;": "⤌",
  	"lbbrk;": "❲",
  	"lbrke;": "⦋",
  	"lceil;": "⌈",
  	"ldquo;": "“",
  	"lescc;": "⪨",
  	"lhard;": "↽",
  	"lharu;": "↼",
  	"lhblk;": "▄",
  	"llarr;": "⇇",
  	"lltri;": "◺",
  	"lneqq;": "≨",
  	"lnsim;": "⋦",
  	"loang;": "⟬",
  	"loarr;": "⇽",
  	"lobrk;": "⟦",
  	"lopar;": "⦅",
  	"lrarr;": "⇆",
  	"lrhar;": "⇋",
  	"lrtri;": "⊿",
  	"lsime;": "⪍",
  	"lsimg;": "⪏",
  	"lsquo;": "‘",
  	"ltcir;": "⩹",
  	"ltdot;": "⋖",
  	"ltrie;": "⊴",
  	"ltrif;": "◂",
  	"mdash;": "—",
  	"mDDot;": "∺",
  	"micro;": "µ",
  	middot: "·",
  	"minus;": "−",
  	"mumap;": "⊸",
  	"nabla;": "∇",
  	"napid;": "≋̸",
  	"napos;": "ŉ",
  	"natur;": "♮",
  	"nbump;": "≎̸",
  	"ncong;": "≇",
  	"ndash;": "–",
  	"neArr;": "⇗",
  	"nearr;": "↗",
  	"nedot;": "≐̸",
  	"nesim;": "≂̸",
  	"ngeqq;": "≧̸",
  	"ngsim;": "≵",
  	"nhArr;": "⇎",
  	"nharr;": "↮",
  	"nhpar;": "⫲",
  	"nlArr;": "⇍",
  	"nlarr;": "↚",
  	"nleqq;": "≦̸",
  	"nless;": "≮",
  	"nlsim;": "≴",
  	"nltri;": "⋪",
  	"notin;": "∉",
  	"notni;": "∌",
  	"npart;": "∂̸",
  	"nprec;": "⊀",
  	"nrArr;": "⇏",
  	"nrarr;": "↛",
  	"nrtri;": "⋫",
  	"nsime;": "≄",
  	"nsmid;": "∤",
  	"nspar;": "∦",
  	"nsubE;": "⫅̸",
  	"nsube;": "⊈",
  	"nsucc;": "⊁",
  	"nsupE;": "⫆̸",
  	"nsupe;": "⊉",
  	Ntilde: "Ñ",
  	ntilde: "ñ",
  	"numsp;": " ",
  	"nvsim;": "∼⃒",
  	"nwArr;": "⇖",
  	"nwarr;": "↖",
  	Oacute: "Ó",
  	oacute: "ó",
  	"Ocirc;": "Ô",
  	"ocirc;": "ô",
  	"odash;": "⊝",
  	"OElig;": "Œ",
  	"oelig;": "œ",
  	"ofcir;": "⦿",
  	Ograve: "Ò",
  	ograve: "ò",
  	"ohbar;": "⦵",
  	"olarr;": "↺",
  	"olcir;": "⦾",
  	"oline;": "‾",
  	"Omacr;": "Ō",
  	"omacr;": "ō",
  	"Omega;": "Ω",
  	"omega;": "ω",
  	"operp;": "⦹",
  	"oplus;": "⊕",
  	"orarr;": "↻",
  	"order;": "ℴ",
  	Oslash: "Ø",
  	oslash: "ø",
  	Otilde: "Õ",
  	otilde: "õ",
  	"ovbar;": "⌽",
  	"parsl;": "⫽",
  	"phone;": "☎",
  	"plusb;": "⊞",
  	"pluse;": "⩲",
  	plusmn: "±",
  	"pound;": "£",
  	"prcue;": "≼",
  	"Prime;": "″",
  	"prime;": "′",
  	"prnap;": "⪹",
  	"prsim;": "≾",
  	"quest;": "?",
  	"rAarr;": "⇛",
  	"radic;": "√",
  	"rangd;": "⦒",
  	"range;": "⦥",
  	"raquo;": "»",
  	"rarrb;": "⇥",
  	"rarrc;": "⤳",
  	"rarrw;": "↝",
  	"ratio;": "∶",
  	"RBarr;": "⤐",
  	"rBarr;": "⤏",
  	"rbarr;": "⤍",
  	"rbbrk;": "❳",
  	"rbrke;": "⦌",
  	"rceil;": "⌉",
  	"rdquo;": "”",
  	"reals;": "ℝ",
  	"rhard;": "⇁",
  	"rharu;": "⇀",
  	"rlarr;": "⇄",
  	"rlhar;": "⇌",
  	"rnmid;": "⫮",
  	"roang;": "⟭",
  	"roarr;": "⇾",
  	"robrk;": "⟧",
  	"ropar;": "⦆",
  	"rrarr;": "⇉",
  	"rsquo;": "’",
  	"rtrie;": "⊵",
  	"rtrif;": "▸",
  	"sbquo;": "‚",
  	"sccue;": "≽",
  	"Scirc;": "Ŝ",
  	"scirc;": "ŝ",
  	"scnap;": "⪺",
  	"scsim;": "≿",
  	"sdotb;": "⊡",
  	"sdote;": "⩦",
  	"seArr;": "⇘",
  	"searr;": "↘",
  	"setmn;": "∖",
  	"sharp;": "♯",
  	"Sigma;": "Σ",
  	"sigma;": "σ",
  	"simeq;": "≃",
  	"simgE;": "⪠",
  	"simlE;": "⪟",
  	"simne;": "≆",
  	"slarr;": "←",
  	"smile;": "⌣",
  	"smtes;": "⪬︀",
  	"sqcap;": "⊓",
  	"sqcup;": "⊔",
  	"sqsub;": "⊏",
  	"sqsup;": "⊐",
  	"srarr;": "→",
  	"starf;": "★",
  	"strns;": "¯",
  	"subnE;": "⫋",
  	"subne;": "⊊",
  	"supnE;": "⫌",
  	"supne;": "⊋",
  	"swArr;": "⇙",
  	"swarr;": "↙",
  	"szlig;": "ß",
  	"Theta;": "Θ",
  	"theta;": "θ",
  	"thkap;": "≈",
  	"THORN;": "Þ",
  	"thorn;": "þ",
  	"Tilde;": "∼",
  	"tilde;": "˜",
  	"times;": "×",
  	"TRADE;": "™",
  	"trade;": "™",
  	"trisb;": "⧍",
  	"TSHcy;": "Ћ",
  	"tshcy;": "ћ",
  	"twixt;": "≬",
  	Uacute: "Ú",
  	uacute: "ú",
  	"Ubrcy;": "Ў",
  	"ubrcy;": "ў",
  	"Ucirc;": "Û",
  	"ucirc;": "û",
  	"udarr;": "⇅",
  	"udhar;": "⥮",
  	Ugrave: "Ù",
  	ugrave: "ù",
  	"uharl;": "↿",
  	"uharr;": "↾",
  	"uhblk;": "▀",
  	"ultri;": "◸",
  	"Umacr;": "Ū",
  	"umacr;": "ū",
  	"Union;": "⋃",
  	"Uogon;": "Ų",
  	"uogon;": "ų",
  	"uplus;": "⊎",
  	"upsih;": "ϒ",
  	"UpTee;": "⊥",
  	"Uring;": "Ů",
  	"uring;": "ů",
  	"urtri;": "◹",
  	"utdot;": "⋰",
  	"utrif;": "▴",
  	"uuarr;": "⇈",
  	"varpi;": "ϖ",
  	"vBarv;": "⫩",
  	"VDash;": "⊫",
  	"Vdash;": "⊩",
  	"vDash;": "⊨",
  	"vdash;": "⊢",
  	"veeeq;": "≚",
  	"vltri;": "⊲",
  	"vnsub;": "⊂⃒",
  	"vnsup;": "⊃⃒",
  	"vprop;": "∝",
  	"vrtri;": "⊳",
  	"Wcirc;": "Ŵ",
  	"wcirc;": "ŵ",
  	"Wedge;": "⋀",
  	"wedge;": "∧",
  	"xcirc;": "◯",
  	"xdtri;": "▽",
  	"xhArr;": "⟺",
  	"xharr;": "⟷",
  	"xlArr;": "⟸",
  	"xlarr;": "⟵",
  	"xodot;": "⨀",
  	"xrArr;": "⟹",
  	"xrarr;": "⟶",
  	"xutri;": "△",
  	Yacute: "Ý",
  	yacute: "ý",
  	"Ycirc;": "Ŷ",
  	"ycirc;": "ŷ",
  	"Aacute;": "Á",
  	"aacute;": "á",
  	"Abreve;": "Ă",
  	"abreve;": "ă",
  	"Agrave;": "À",
  	"agrave;": "à",
  	"andand;": "⩕",
  	"angmsd;": "∡",
  	"angsph;": "∢",
  	"apacir;": "⩯",
  	"approx;": "≈",
  	"Assign;": "≔",
  	"Atilde;": "Ã",
  	"atilde;": "ã",
  	"barvee;": "⊽",
  	"Barwed;": "⌆",
  	"barwed;": "⌅",
  	"becaus;": "∵",
  	"bernou;": "ℬ",
  	"bigcap;": "⋂",
  	"bigcup;": "⋃",
  	"bigvee;": "⋁",
  	"bkarow;": "⤍",
  	"bottom;": "⊥",
  	"bowtie;": "⋈",
  	"boxbox;": "⧉",
  	"bprime;": "‵",
  	"brvbar;": "¦",
  	"bullet;": "•",
  	"Bumpeq;": "≎",
  	"bumpeq;": "≏",
  	"Cacute;": "Ć",
  	"cacute;": "ć",
  	"capand;": "⩄",
  	"capcap;": "⩋",
  	"capcup;": "⩇",
  	"capdot;": "⩀",
  	"Ccaron;": "Č",
  	"ccaron;": "č",
  	"Ccedil;": "Ç",
  	"ccedil;": "ç",
  	"circeq;": "≗",
  	"cirmid;": "⫯",
  	"Colone;": "⩴",
  	"colone;": "≔",
  	"commat;": "@",
  	"compfn;": "∘",
  	"Conint;": "∯",
  	"conint;": "∮",
  	"coprod;": "∐",
  	"copysr;": "℗",
  	"cularr;": "↶",
  	"CupCap;": "≍",
  	"cupcap;": "⩆",
  	"cupcup;": "⩊",
  	"cupdot;": "⊍",
  	"curarr;": "↷",
  	"curren;": "¤",
  	"cylcty;": "⌭",
  	"Dagger;": "‡",
  	"dagger;": "†",
  	"daleth;": "ℸ",
  	"Dcaron;": "Ď",
  	"dcaron;": "ď",
  	"dfisht;": "⥿",
  	"divide;": "÷",
  	"divonx;": "⋇",
  	"dlcorn;": "⌞",
  	"dlcrop;": "⌍",
  	"dollar;": "$",
  	"DotDot;": "⃜",
  	"drcorn;": "⌟",
  	"drcrop;": "⌌",
  	"Dstrok;": "Đ",
  	"dstrok;": "đ",
  	"Eacute;": "É",
  	"eacute;": "é",
  	"easter;": "⩮",
  	"Ecaron;": "Ě",
  	"ecaron;": "ě",
  	"ecolon;": "≕",
  	"Egrave;": "È",
  	"egrave;": "è",
  	"egsdot;": "⪘",
  	"elsdot;": "⪗",
  	"emptyv;": "∅",
  	"emsp13;": " ",
  	"emsp14;": " ",
  	"eparsl;": "⧣",
  	"eqcirc;": "≖",
  	"equals;": "=",
  	"equest;": "≟",
  	"Exists;": "∃",
  	"female;": "♀",
  	"ffilig;": "ﬃ",
  	"ffllig;": "ﬄ",
  	"ForAll;": "∀",
  	"forall;": "∀",
  	"frac12;": "½",
  	"frac13;": "⅓",
  	"frac14;": "¼",
  	"frac15;": "⅕",
  	"frac16;": "⅙",
  	"frac18;": "⅛",
  	"frac23;": "⅔",
  	"frac25;": "⅖",
  	"frac34;": "¾",
  	"frac35;": "⅗",
  	"frac38;": "⅜",
  	"frac45;": "⅘",
  	"frac56;": "⅚",
  	"frac58;": "⅝",
  	"frac78;": "⅞",
  	"gacute;": "ǵ",
  	"Gammad;": "Ϝ",
  	"gammad;": "ϝ",
  	"Gbreve;": "Ğ",
  	"gbreve;": "ğ",
  	"Gcedil;": "Ģ",
  	"gesdot;": "⪀",
  	"gesles;": "⪔",
  	"gtlPar;": "⦕",
  	"gtrarr;": "⥸",
  	"gtrdot;": "⋗",
  	"gtrsim;": "≳",
  	"hairsp;": " ",
  	"hamilt;": "ℋ",
  	"HARDcy;": "Ъ",
  	"hardcy;": "ъ",
  	"hearts;": "♥",
  	"hellip;": "…",
  	"hercon;": "⊹",
  	"homtht;": "∻",
  	"horbar;": "―",
  	"hslash;": "ℏ",
  	"Hstrok;": "Ħ",
  	"hstrok;": "ħ",
  	"hybull;": "⁃",
  	"hyphen;": "‐",
  	"Iacute;": "Í",
  	"iacute;": "í",
  	"Igrave;": "Ì",
  	"igrave;": "ì",
  	"iiiint;": "⨌",
  	"iinfin;": "⧜",
  	"incare;": "℅",
  	"inodot;": "ı",
  	"intcal;": "⊺",
  	"iquest;": "¿",
  	"isinsv;": "⋳",
  	"Itilde;": "Ĩ",
  	"itilde;": "ĩ",
  	"Jsercy;": "Ј",
  	"jsercy;": "ј",
  	"kappav;": "ϰ",
  	"Kcedil;": "Ķ",
  	"kcedil;": "ķ",
  	"kgreen;": "ĸ",
  	"Lacute;": "Ĺ",
  	"lacute;": "ĺ",
  	"lagran;": "ℒ",
  	"Lambda;": "Λ",
  	"lambda;": "λ",
  	"langle;": "⟨",
  	"larrfs;": "⤝",
  	"larrhk;": "↩",
  	"larrlp;": "↫",
  	"larrpl;": "⤹",
  	"larrtl;": "↢",
  	"lAtail;": "⤛",
  	"latail;": "⤙",
  	"lbrace;": "{",
  	"lbrack;": "[",
  	"Lcaron;": "Ľ",
  	"lcaron;": "ľ",
  	"Lcedil;": "Ļ",
  	"lcedil;": "ļ",
  	"ldquor;": "„",
  	"lesdot;": "⩿",
  	"lesges;": "⪓",
  	"lfisht;": "⥼",
  	"lfloor;": "⌊",
  	"lharul;": "⥪",
  	"llhard;": "⥫",
  	"Lmidot;": "Ŀ",
  	"lmidot;": "ŀ",
  	"lmoust;": "⎰",
  	"loplus;": "⨭",
  	"lowast;": "∗",
  	"lowbar;": "_",
  	"lparlt;": "⦓",
  	"lrhard;": "⥭",
  	"lsaquo;": "‹",
  	"lsquor;": "‚",
  	"Lstrok;": "Ł",
  	"lstrok;": "ł",
  	"lthree;": "⋋",
  	"ltimes;": "⋉",
  	"ltlarr;": "⥶",
  	"ltrPar;": "⦖",
  	"mapsto;": "↦",
  	"marker;": "▮",
  	"mcomma;": "⨩",
  	"midast;": "*",
  	"midcir;": "⫰",
  	"middot;": "·",
  	"minusb;": "⊟",
  	"minusd;": "∸",
  	"mnplus;": "∓",
  	"models;": "⊧",
  	"mstpos;": "∾",
  	"Nacute;": "Ń",
  	"nacute;": "ń",
  	"nbumpe;": "≏̸",
  	"Ncaron;": "Ň",
  	"ncaron;": "ň",
  	"Ncedil;": "Ņ",
  	"ncedil;": "ņ",
  	"nearhk;": "⤤",
  	"nequiv;": "≢",
  	"nesear;": "⤨",
  	"nexist;": "∄",
  	"nltrie;": "⋬",
  	"notinE;": "⋹̸",
  	"nparsl;": "⫽⃥",
  	"nprcue;": "⋠",
  	"nrarrc;": "⤳̸",
  	"nrarrw;": "↝̸",
  	"nrtrie;": "⋭",
  	"nsccue;": "⋡",
  	"nsimeq;": "≄",
  	"Ntilde;": "Ñ",
  	"ntilde;": "ñ",
  	"numero;": "№",
  	"nVDash;": "⊯",
  	"nVdash;": "⊮",
  	"nvDash;": "⊭",
  	"nvdash;": "⊬",
  	"nvHarr;": "⤄",
  	"nvlArr;": "⤂",
  	"nvrArr;": "⤃",
  	"nwarhk;": "⤣",
  	"nwnear;": "⤧",
  	"Oacute;": "Ó",
  	"oacute;": "ó",
  	"Odblac;": "Ő",
  	"odblac;": "ő",
  	"odsold;": "⦼",
  	"Ograve;": "Ò",
  	"ograve;": "ò",
  	"ominus;": "⊖",
  	"origof;": "⊶",
  	"Oslash;": "Ø",
  	"oslash;": "ø",
  	"Otilde;": "Õ",
  	"otilde;": "õ",
  	"Otimes;": "⨷",
  	"otimes;": "⊗",
  	"parsim;": "⫳",
  	"percnt;": "%",
  	"period;": ".",
  	"permil;": "‰",
  	"phmmat;": "ℳ",
  	"planck;": "ℏ",
  	"plankv;": "ℏ",
  	"plusdo;": "∔",
  	"plusdu;": "⨥",
  	"plusmn;": "±",
  	"preceq;": "⪯",
  	"primes;": "ℙ",
  	"prnsim;": "⋨",
  	"propto;": "∝",
  	"prurel;": "⊰",
  	"puncsp;": " ",
  	"qprime;": "⁗",
  	"Racute;": "Ŕ",
  	"racute;": "ŕ",
  	"rangle;": "⟩",
  	"rarrap;": "⥵",
  	"rarrfs;": "⤞",
  	"rarrhk;": "↪",
  	"rarrlp;": "↬",
  	"rarrpl;": "⥅",
  	"Rarrtl;": "⤖",
  	"rarrtl;": "↣",
  	"rAtail;": "⤜",
  	"ratail;": "⤚",
  	"rbrace;": "}",
  	"rbrack;": "]",
  	"Rcaron;": "Ř",
  	"rcaron;": "ř",
  	"Rcedil;": "Ŗ",
  	"rcedil;": "ŗ",
  	"rdquor;": "”",
  	"rfisht;": "⥽",
  	"rfloor;": "⌋",
  	"rharul;": "⥬",
  	"rmoust;": "⎱",
  	"roplus;": "⨮",
  	"rpargt;": "⦔",
  	"rsaquo;": "›",
  	"rsquor;": "’",
  	"rthree;": "⋌",
  	"rtimes;": "⋊",
  	"Sacute;": "Ś",
  	"sacute;": "ś",
  	"Scaron;": "Š",
  	"scaron;": "š",
  	"Scedil;": "Ş",
  	"scedil;": "ş",
  	"scnsim;": "⋩",
  	"searhk;": "⤥",
  	"seswar;": "⤩",
  	"sfrown;": "⌢",
  	"SHCHcy;": "Щ",
  	"shchcy;": "щ",
  	"sigmaf;": "ς",
  	"sigmav;": "ς",
  	"simdot;": "⩪",
  	"smashp;": "⨳",
  	"SOFTcy;": "Ь",
  	"softcy;": "ь",
  	"solbar;": "⌿",
  	"spades;": "♠",
  	"sqcaps;": "⊓︀",
  	"sqcups;": "⊔︀",
  	"sqsube;": "⊑",
  	"sqsupe;": "⊒",
  	"Square;": "□",
  	"square;": "□",
  	"squarf;": "▪",
  	"ssetmn;": "∖",
  	"ssmile;": "⌣",
  	"sstarf;": "⋆",
  	"subdot;": "⪽",
  	"Subset;": "⋐",
  	"subset;": "⊂",
  	"subsim;": "⫇",
  	"subsub;": "⫕",
  	"subsup;": "⫓",
  	"succeq;": "⪰",
  	"supdot;": "⪾",
  	"Supset;": "⋑",
  	"supset;": "⊃",
  	"supsim;": "⫈",
  	"supsub;": "⫔",
  	"supsup;": "⫖",
  	"swarhk;": "⤦",
  	"swnwar;": "⤪",
  	"target;": "⌖",
  	"Tcaron;": "Ť",
  	"tcaron;": "ť",
  	"Tcedil;": "Ţ",
  	"tcedil;": "ţ",
  	"telrec;": "⌕",
  	"there4;": "∴",
  	"thetav;": "ϑ",
  	"thinsp;": " ",
  	"thksim;": "∼",
  	"timesb;": "⊠",
  	"timesd;": "⨰",
  	"topbot;": "⌶",
  	"topcir;": "⫱",
  	"tprime;": "‴",
  	"tridot;": "◬",
  	"Tstrok;": "Ŧ",
  	"tstrok;": "ŧ",
  	"Uacute;": "Ú",
  	"uacute;": "ú",
  	"Ubreve;": "Ŭ",
  	"ubreve;": "ŭ",
  	"Udblac;": "Ű",
  	"udblac;": "ű",
  	"ufisht;": "⥾",
  	"Ugrave;": "Ù",
  	"ugrave;": "ù",
  	"ulcorn;": "⌜",
  	"ulcrop;": "⌏",
  	"urcorn;": "⌝",
  	"urcrop;": "⌎",
  	"Utilde;": "Ũ",
  	"utilde;": "ũ",
  	"vangrt;": "⦜",
  	"varphi;": "ϕ",
  	"varrho;": "ϱ",
  	"Vdashl;": "⫦",
  	"veebar;": "⊻",
  	"vellip;": "⋮",
  	"Verbar;": "‖",
  	"verbar;": "|",
  	"vsubnE;": "⫋︀",
  	"vsubne;": "⊊︀",
  	"vsupnE;": "⫌︀",
  	"vsupne;": "⊋︀",
  	"Vvdash;": "⊪",
  	"wedbar;": "⩟",
  	"wedgeq;": "≙",
  	"weierp;": "℘",
  	"wreath;": "≀",
  	"xoplus;": "⨁",
  	"xotime;": "⨂",
  	"xsqcup;": "⨆",
  	"xuplus;": "⨄",
  	"xwedge;": "⋀",
  	"Yacute;": "Ý",
  	"yacute;": "ý",
  	"Zacute;": "Ź",
  	"zacute;": "ź",
  	"Zcaron;": "Ž",
  	"zcaron;": "ž",
  	"zeetrf;": "ℨ",
  	"alefsym;": "ℵ",
  	"angrtvb;": "⊾",
  	"angzarr;": "⍼",
  	"asympeq;": "≍",
  	"backsim;": "∽",
  	"Because;": "∵",
  	"because;": "∵",
  	"bemptyv;": "⦰",
  	"between;": "≬",
  	"bigcirc;": "◯",
  	"bigodot;": "⨀",
  	"bigstar;": "★",
  	"bnequiv;": "≡⃥",
  	"boxplus;": "⊞",
  	"Cayleys;": "ℭ",
  	"Cconint;": "∰",
  	"ccupssm;": "⩐",
  	"Cedilla;": "¸",
  	"cemptyv;": "⦲",
  	"cirscir;": "⧂",
  	"coloneq;": "≔",
  	"congdot;": "⩭",
  	"cudarrl;": "⤸",
  	"cudarrr;": "⤵",
  	"cularrp;": "⤽",
  	"curarrm;": "⤼",
  	"dbkarow;": "⤏",
  	"ddagger;": "‡",
  	"ddotseq;": "⩷",
  	"demptyv;": "⦱",
  	"Diamond;": "⋄",
  	"diamond;": "⋄",
  	"digamma;": "ϝ",
  	"dotplus;": "∔",
  	"DownTee;": "⊤",
  	"dwangle;": "⦦",
  	"Element;": "∈",
  	"Epsilon;": "Ε",
  	"epsilon;": "ε",
  	"eqcolon;": "≕",
  	"equivDD;": "⩸",
  	"gesdoto;": "⪂",
  	"gtquest;": "⩼",
  	"gtrless;": "≷",
  	"harrcir;": "⥈",
  	"Implies;": "⇒",
  	"intprod;": "⨼",
  	"isindot;": "⋵",
  	"larrbfs;": "⤟",
  	"larrsim;": "⥳",
  	"lbrksld;": "⦏",
  	"lbrkslu;": "⦍",
  	"ldrdhar;": "⥧",
  	"LeftTee;": "⊣",
  	"lesdoto;": "⪁",
  	"lessdot;": "⋖",
  	"lessgtr;": "≶",
  	"lesssim;": "≲",
  	"lotimes;": "⨴",
  	"lozenge;": "◊",
  	"ltquest;": "⩻",
  	"luruhar;": "⥦",
  	"maltese;": "✠",
  	"minusdu;": "⨪",
  	"napprox;": "≉",
  	"natural;": "♮",
  	"nearrow;": "↗",
  	"NewLine;": "\n",
  	"nexists;": "∄",
  	"NoBreak;": "⁠",
  	"notinva;": "∉",
  	"notinvb;": "⋷",
  	"notinvc;": "⋶",
  	"NotLess;": "≮",
  	"notniva;": "∌",
  	"notnivb;": "⋾",
  	"notnivc;": "⋽",
  	"npolint;": "⨔",
  	"npreceq;": "⪯̸",
  	"nsqsube;": "⋢",
  	"nsqsupe;": "⋣",
  	"nsubset;": "⊂⃒",
  	"nsucceq;": "⪰̸",
  	"nsupset;": "⊃⃒",
  	"nvinfin;": "⧞",
  	"nvltrie;": "⊴⃒",
  	"nvrtrie;": "⊵⃒",
  	"nwarrow;": "↖",
  	"olcross;": "⦻",
  	"Omicron;": "Ο",
  	"omicron;": "ο",
  	"orderof;": "ℴ",
  	"orslope;": "⩗",
  	"OverBar;": "‾",
  	"pertenk;": "‱",
  	"planckh;": "ℎ",
  	"pluscir;": "⨢",
  	"plussim;": "⨦",
  	"plustwo;": "⨧",
  	"precsim;": "≾",
  	"Product;": "∏",
  	"quatint;": "⨖",
  	"questeq;": "≟",
  	"rarrbfs;": "⤠",
  	"rarrsim;": "⥴",
  	"rbrksld;": "⦎",
  	"rbrkslu;": "⦐",
  	"rdldhar;": "⥩",
  	"realine;": "ℛ",
  	"rotimes;": "⨵",
  	"ruluhar;": "⥨",
  	"searrow;": "↘",
  	"simplus;": "⨤",
  	"simrarr;": "⥲",
  	"subedot;": "⫃",
  	"submult;": "⫁",
  	"subplus;": "⪿",
  	"subrarr;": "⥹",
  	"succsim;": "≿",
  	"supdsub;": "⫘",
  	"supedot;": "⫄",
  	"suphsol;": "⟉",
  	"suphsub;": "⫗",
  	"suplarr;": "⥻",
  	"supmult;": "⫂",
  	"supplus;": "⫀",
  	"swarrow;": "↙",
  	"topfork;": "⫚",
  	"triplus;": "⨹",
  	"tritime;": "⨻",
  	"UpArrow;": "↑",
  	"Uparrow;": "⇑",
  	"uparrow;": "↑",
  	"Upsilon;": "Υ",
  	"upsilon;": "υ",
  	"uwangle;": "⦧",
  	"vzigzag;": "⦚",
  	"zigrarr;": "⇝",
  	"andslope;": "⩘",
  	"angmsdaa;": "⦨",
  	"angmsdab;": "⦩",
  	"angmsdac;": "⦪",
  	"angmsdad;": "⦫",
  	"angmsdae;": "⦬",
  	"angmsdaf;": "⦭",
  	"angmsdag;": "⦮",
  	"angmsdah;": "⦯",
  	"angrtvbd;": "⦝",
  	"approxeq;": "≊",
  	"awconint;": "∳",
  	"backcong;": "≌",
  	"barwedge;": "⌅",
  	"bbrktbrk;": "⎶",
  	"bigoplus;": "⨁",
  	"bigsqcup;": "⨆",
  	"biguplus;": "⨄",
  	"bigwedge;": "⋀",
  	"boxminus;": "⊟",
  	"boxtimes;": "⊠",
  	"bsolhsub;": "⟈",
  	"capbrcup;": "⩉",
  	"circledR;": "®",
  	"circledS;": "Ⓢ",
  	"cirfnint;": "⨐",
  	"clubsuit;": "♣",
  	"cupbrcap;": "⩈",
  	"curlyvee;": "⋎",
  	"cwconint;": "∲",
  	"DDotrahd;": "⤑",
  	"doteqdot;": "≑",
  	"DotEqual;": "≐",
  	"dotminus;": "∸",
  	"drbkarow;": "⤐",
  	"dzigrarr;": "⟿",
  	"elinters;": "⏧",
  	"emptyset;": "∅",
  	"eqvparsl;": "⧥",
  	"fpartint;": "⨍",
  	"geqslant;": "⩾",
  	"gesdotol;": "⪄",
  	"gnapprox;": "⪊",
  	"hksearow;": "⤥",
  	"hkswarow;": "⤦",
  	"imagline;": "ℐ",
  	"imagpart;": "ℑ",
  	"infintie;": "⧝",
  	"integers;": "ℤ",
  	"Integral;": "∫",
  	"intercal;": "⊺",
  	"intlarhk;": "⨗",
  	"laemptyv;": "⦴",
  	"ldrushar;": "⥋",
  	"leqslant;": "⩽",
  	"lesdotor;": "⪃",
  	"LessLess;": "⪡",
  	"llcorner;": "⌞",
  	"lnapprox;": "⪉",
  	"lrcorner;": "⌟",
  	"lurdshar;": "⥊",
  	"mapstoup;": "↥",
  	"multimap;": "⊸",
  	"naturals;": "ℕ",
  	"ncongdot;": "⩭̸",
  	"NotEqual;": "≠",
  	"notindot;": "⋵̸",
  	"NotTilde;": "≁",
  	"otimesas;": "⨶",
  	"parallel;": "∥",
  	"PartialD;": "∂",
  	"plusacir;": "⨣",
  	"pointint;": "⨕",
  	"Precedes;": "≺",
  	"precneqq;": "⪵",
  	"precnsim;": "⋨",
  	"profalar;": "⌮",
  	"profline;": "⌒",
  	"profsurf;": "⌓",
  	"raemptyv;": "⦳",
  	"realpart;": "ℜ",
  	"RightTee;": "⊢",
  	"rppolint;": "⨒",
  	"rtriltri;": "⧎",
  	"scpolint;": "⨓",
  	"setminus;": "∖",
  	"shortmid;": "∣",
  	"smeparsl;": "⧤",
  	"sqsubset;": "⊏",
  	"sqsupset;": "⊐",
  	"subseteq;": "⊆",
  	"Succeeds;": "≻",
  	"succneqq;": "⪶",
  	"succnsim;": "⋩",
  	"SuchThat;": "∋",
  	"Superset;": "⊃",
  	"supseteq;": "⊇",
  	"thetasym;": "ϑ",
  	"thicksim;": "∼",
  	"timesbar;": "⨱",
  	"triangle;": "▵",
  	"triminus;": "⨺",
  	"trpezium;": "⏢",
  	"Uarrocir;": "⥉",
  	"ulcorner;": "⌜",
  	"UnderBar;": "_",
  	"urcorner;": "⌝",
  	"varkappa;": "ϰ",
  	"varsigma;": "ς",
  	"vartheta;": "ϑ",
  	"backprime;": "‵",
  	"backsimeq;": "⋍",
  	"Backslash;": "∖",
  	"bigotimes;": "⨂",
  	"CenterDot;": "·",
  	"centerdot;": "·",
  	"checkmark;": "✓",
  	"CircleDot;": "⊙",
  	"complexes;": "ℂ",
  	"Congruent;": "≡",
  	"Coproduct;": "∐",
  	"dotsquare;": "⊡",
  	"DoubleDot;": "¨",
  	"DownArrow;": "↓",
  	"Downarrow;": "⇓",
  	"downarrow;": "↓",
  	"DownBreve;": "̑",
  	"gtrapprox;": "⪆",
  	"gtreqless;": "⋛",
  	"gvertneqq;": "≩︀",
  	"heartsuit;": "♥",
  	"HumpEqual;": "≏",
  	"LeftArrow;": "←",
  	"Leftarrow;": "⇐",
  	"leftarrow;": "←",
  	"LeftFloor;": "⌊",
  	"lesseqgtr;": "⋚",
  	"LessTilde;": "≲",
  	"lvertneqq;": "≨︀",
  	"Mellintrf;": "ℳ",
  	"MinusPlus;": "∓",
  	"ngeqslant;": "⩾̸",
  	"nleqslant;": "⩽̸",
  	"NotCupCap;": "≭",
  	"NotExists;": "∄",
  	"NotSubset;": "⊂⃒",
  	"nparallel;": "∦",
  	"nshortmid;": "∤",
  	"nsubseteq;": "⊈",
  	"nsupseteq;": "⊉",
  	"OverBrace;": "⏞",
  	"pitchfork;": "⋔",
  	"PlusMinus;": "±",
  	"rationals;": "ℚ",
  	"spadesuit;": "♠",
  	"subseteqq;": "⫅",
  	"subsetneq;": "⊊",
  	"supseteqq;": "⫆",
  	"supsetneq;": "⊋",
  	"Therefore;": "∴",
  	"therefore;": "∴",
  	"ThinSpace;": " ",
  	"triangleq;": "≜",
  	"TripleDot;": "⃛",
  	"UnionPlus;": "⊎",
  	"varpropto;": "∝",
  	"Bernoullis;": "ℬ",
  	"circledast;": "⊛",
  	"CirclePlus;": "⊕",
  	"complement;": "∁",
  	"curlywedge;": "⋏",
  	"eqslantgtr;": "⪖",
  	"EqualTilde;": "≂",
  	"Fouriertrf;": "ℱ",
  	"gtreqqless;": "⪌",
  	"ImaginaryI;": "ⅈ",
  	"Laplacetrf;": "ℒ",
  	"LeftVector;": "↼",
  	"lessapprox;": "⪅",
  	"lesseqqgtr;": "⪋",
  	"Lleftarrow;": "⇚",
  	"lmoustache;": "⎰",
  	"longmapsto;": "⟼",
  	"mapstodown;": "↧",
  	"mapstoleft;": "↤",
  	"nLeftarrow;": "⇍",
  	"nleftarrow;": "↚",
  	"NotElement;": "∉",
  	"NotGreater;": "≯",
  	"nsubseteqq;": "⫅̸",
  	"nsupseteqq;": "⫆̸",
  	"precapprox;": "⪷",
  	"Proportion;": "∷",
  	"RightArrow;": "→",
  	"Rightarrow;": "⇒",
  	"rightarrow;": "→",
  	"RightFloor;": "⌋",
  	"rmoustache;": "⎱",
  	"sqsubseteq;": "⊑",
  	"sqsupseteq;": "⊒",
  	"subsetneqq;": "⫋",
  	"succapprox;": "⪸",
  	"supsetneqq;": "⫌",
  	"ThickSpace;": "  ",
  	"TildeEqual;": "≃",
  	"TildeTilde;": "≈",
  	"UnderBrace;": "⏟",
  	"UpArrowBar;": "⤒",
  	"UpTeeArrow;": "↥",
  	"upuparrows;": "⇈",
  	"varepsilon;": "ϵ",
  	"varnothing;": "∅",
  	"backepsilon;": "϶",
  	"blacksquare;": "▪",
  	"circledcirc;": "⊚",
  	"circleddash;": "⊝",
  	"CircleMinus;": "⊖",
  	"CircleTimes;": "⊗",
  	"curlyeqprec;": "⋞",
  	"curlyeqsucc;": "⋟",
  	"diamondsuit;": "♦",
  	"eqslantless;": "⪕",
  	"Equilibrium;": "⇌",
  	"expectation;": "ℰ",
  	"GreaterLess;": "≷",
  	"LeftCeiling;": "⌈",
  	"LessGreater;": "≶",
  	"MediumSpace;": " ",
  	"NotLessLess;": "≪̸",
  	"NotPrecedes;": "⊀",
  	"NotSucceeds;": "⊁",
  	"NotSuperset;": "⊃⃒",
  	"nRightarrow;": "⇏",
  	"nrightarrow;": "↛",
  	"OverBracket;": "⎴",
  	"preccurlyeq;": "≼",
  	"precnapprox;": "⪹",
  	"quaternions;": "ℍ",
  	"RightVector;": "⇀",
  	"Rrightarrow;": "⇛",
  	"RuleDelayed;": "⧴",
  	"SmallCircle;": "∘",
  	"SquareUnion;": "⊔",
  	"straightphi;": "ϕ",
  	"SubsetEqual;": "⊆",
  	"succcurlyeq;": "≽",
  	"succnapprox;": "⪺",
  	"thickapprox;": "≈",
  	"UpDownArrow;": "↕",
  	"Updownarrow;": "⇕",
  	"updownarrow;": "↕",
  	"VerticalBar;": "∣",
  	"blacklozenge;": "⧫",
  	"DownArrowBar;": "⤓",
  	"DownTeeArrow;": "↧",
  	"ExponentialE;": "ⅇ",
  	"exponentiale;": "ⅇ",
  	"GreaterEqual;": "≥",
  	"GreaterTilde;": "≳",
  	"HilbertSpace;": "ℋ",
  	"HumpDownHump;": "≎",
  	"Intersection;": "⋂",
  	"LeftArrowBar;": "⇤",
  	"LeftTeeArrow;": "↤",
  	"LeftTriangle;": "⊲",
  	"LeftUpVector;": "↿",
  	"NotCongruent;": "≢",
  	"NotHumpEqual;": "≏̸",
  	"NotLessEqual;": "≰",
  	"NotLessTilde;": "≴",
  	"Proportional;": "∝",
  	"RightCeiling;": "⌉",
  	"risingdotseq;": "≓",
  	"RoundImplies;": "⥰",
  	"ShortUpArrow;": "↑",
  	"SquareSubset;": "⊏",
  	"triangledown;": "▿",
  	"triangleleft;": "◃",
  	"UnderBracket;": "⎵",
  	"varsubsetneq;": "⊊︀",
  	"varsupsetneq;": "⊋︀",
  	"VerticalLine;": "|",
  	"ApplyFunction;": "⁡",
  	"bigtriangleup;": "△",
  	"blacktriangle;": "▴",
  	"DifferentialD;": "ⅆ",
  	"divideontimes;": "⋇",
  	"DoubleLeftTee;": "⫤",
  	"DoubleUpArrow;": "⇑",
  	"fallingdotseq;": "≒",
  	"hookleftarrow;": "↩",
  	"leftarrowtail;": "↢",
  	"leftharpoonup;": "↼",
  	"LeftTeeVector;": "⥚",
  	"LeftVectorBar;": "⥒",
  	"LessFullEqual;": "≦",
  	"LongLeftArrow;": "⟵",
  	"Longleftarrow;": "⟸",
  	"longleftarrow;": "⟵",
  	"looparrowleft;": "↫",
  	"measuredangle;": "∡",
  	"NotEqualTilde;": "≂̸",
  	"NotTildeEqual;": "≄",
  	"NotTildeTilde;": "≉",
  	"ntriangleleft;": "⋪",
  	"Poincareplane;": "ℌ",
  	"PrecedesEqual;": "⪯",
  	"PrecedesTilde;": "≾",
  	"RightArrowBar;": "⇥",
  	"RightTeeArrow;": "↦",
  	"RightTriangle;": "⊳",
  	"RightUpVector;": "↾",
  	"shortparallel;": "∥",
  	"smallsetminus;": "∖",
  	"SucceedsEqual;": "⪰",
  	"SucceedsTilde;": "≿",
  	"SupersetEqual;": "⊇",
  	"triangleright;": "▹",
  	"UpEquilibrium;": "⥮",
  	"upharpoonleft;": "↿",
  	"varsubsetneqq;": "⫋︀",
  	"varsupsetneqq;": "⫌︀",
  	"VerticalTilde;": "≀",
  	"VeryThinSpace;": " ",
  	"curvearrowleft;": "↶",
  	"DiacriticalDot;": "˙",
  	"doublebarwedge;": "⌆",
  	"DoubleRightTee;": "⊨",
  	"downdownarrows;": "⇊",
  	"DownLeftVector;": "↽",
  	"GreaterGreater;": "⪢",
  	"hookrightarrow;": "↪",
  	"HorizontalLine;": "─",
  	"InvisibleComma;": "⁣",
  	"InvisibleTimes;": "⁢",
  	"LeftDownVector;": "⇃",
  	"leftleftarrows;": "⇇",
  	"LeftRightArrow;": "↔",
  	"Leftrightarrow;": "⇔",
  	"leftrightarrow;": "↔",
  	"leftthreetimes;": "⋋",
  	"LessSlantEqual;": "⩽",
  	"LongRightArrow;": "⟶",
  	"Longrightarrow;": "⟹",
  	"longrightarrow;": "⟶",
  	"looparrowright;": "↬",
  	"LowerLeftArrow;": "↙",
  	"NestedLessLess;": "≪",
  	"NotGreaterLess;": "≹",
  	"NotLessGreater;": "≸",
  	"NotSubsetEqual;": "⊈",
  	"NotVerticalBar;": "∤",
  	"nshortparallel;": "∦",
  	"ntriangleright;": "⋫",
  	"OpenCurlyQuote;": "‘",
  	"ReverseElement;": "∋",
  	"rightarrowtail;": "↣",
  	"rightharpoonup;": "⇀",
  	"RightTeeVector;": "⥛",
  	"RightVectorBar;": "⥓",
  	"ShortDownArrow;": "↓",
  	"ShortLeftArrow;": "←",
  	"SquareSuperset;": "⊐",
  	"TildeFullEqual;": "≅",
  	"trianglelefteq;": "⊴",
  	"upharpoonright;": "↾",
  	"UpperLeftArrow;": "↖",
  	"ZeroWidthSpace;": "​",
  	"bigtriangledown;": "▽",
  	"circlearrowleft;": "↺",
  	"CloseCurlyQuote;": "’",
  	"ContourIntegral;": "∮",
  	"curvearrowright;": "↷",
  	"DoubleDownArrow;": "⇓",
  	"DoubleLeftArrow;": "⇐",
  	"downharpoonleft;": "⇃",
  	"DownRightVector;": "⇁",
  	"leftharpoondown;": "↽",
  	"leftrightarrows;": "⇆",
  	"LeftRightVector;": "⥎",
  	"LeftTriangleBar;": "⧏",
  	"LeftUpTeeVector;": "⥠",
  	"LeftUpVectorBar;": "⥘",
  	"LowerRightArrow;": "↘",
  	"nLeftrightarrow;": "⇎",
  	"nleftrightarrow;": "↮",
  	"NotGreaterEqual;": "≱",
  	"NotGreaterTilde;": "≵",
  	"NotHumpDownHump;": "≎̸",
  	"NotLeftTriangle;": "⋪",
  	"NotSquareSubset;": "⊏̸",
  	"ntrianglelefteq;": "⋬",
  	"OverParenthesis;": "⏜",
  	"RightDownVector;": "⇂",
  	"rightleftarrows;": "⇄",
  	"rightsquigarrow;": "↝",
  	"rightthreetimes;": "⋌",
  	"ShortRightArrow;": "→",
  	"straightepsilon;": "ϵ",
  	"trianglerighteq;": "⊵",
  	"UpperRightArrow;": "↗",
  	"vartriangleleft;": "⊲",
  	"circlearrowright;": "↻",
  	"DiacriticalAcute;": "´",
  	"DiacriticalGrave;": "`",
  	"DiacriticalTilde;": "˜",
  	"DoubleRightArrow;": "⇒",
  	"DownArrowUpArrow;": "⇵",
  	"downharpoonright;": "⇂",
  	"EmptySmallSquare;": "◻",
  	"GreaterEqualLess;": "⋛",
  	"GreaterFullEqual;": "≧",
  	"LeftAngleBracket;": "⟨",
  	"LeftUpDownVector;": "⥑",
  	"LessEqualGreater;": "⋚",
  	"NonBreakingSpace;": " ",
  	"NotPrecedesEqual;": "⪯̸",
  	"NotRightTriangle;": "⋫",
  	"NotSucceedsEqual;": "⪰̸",
  	"NotSucceedsTilde;": "≿̸",
  	"NotSupersetEqual;": "⊉",
  	"ntrianglerighteq;": "⋭",
  	"rightharpoondown;": "⇁",
  	"rightrightarrows;": "⇉",
  	"RightTriangleBar;": "⧐",
  	"RightUpTeeVector;": "⥜",
  	"RightUpVectorBar;": "⥔",
  	"twoheadleftarrow;": "↞",
  	"UnderParenthesis;": "⏝",
  	"UpArrowDownArrow;": "⇅",
  	"vartriangleright;": "⊳",
  	"blacktriangledown;": "▾",
  	"blacktriangleleft;": "◂",
  	"DoubleUpDownArrow;": "⇕",
  	"DoubleVerticalBar;": "∥",
  	"DownLeftTeeVector;": "⥞",
  	"DownLeftVectorBar;": "⥖",
  	"FilledSmallSquare;": "◼",
  	"GreaterSlantEqual;": "⩾",
  	"LeftDoubleBracket;": "⟦",
  	"LeftDownTeeVector;": "⥡",
  	"LeftDownVectorBar;": "⥙",
  	"leftrightharpoons;": "⇋",
  	"LeftTriangleEqual;": "⊴",
  	"NegativeThinSpace;": "​",
  	"NotGreaterGreater;": "≫̸",
  	"NotLessSlantEqual;": "⩽̸",
  	"NotNestedLessLess;": "⪡̸",
  	"NotReverseElement;": "∌",
  	"NotSquareSuperset;": "⊐̸",
  	"NotTildeFullEqual;": "≇",
  	"RightAngleBracket;": "⟩",
  	"rightleftharpoons;": "⇌",
  	"RightUpDownVector;": "⥏",
  	"SquareSubsetEqual;": "⊑",
  	"twoheadrightarrow;": "↠",
  	"VerticalSeparator;": "❘",
  	"blacktriangleright;": "▸",
  	"DownRightTeeVector;": "⥟",
  	"DownRightVectorBar;": "⥗",
  	"LongLeftRightArrow;": "⟷",
  	"Longleftrightarrow;": "⟺",
  	"longleftrightarrow;": "⟷",
  	"NegativeThickSpace;": "​",
  	"NotLeftTriangleBar;": "⧏̸",
  	"PrecedesSlantEqual;": "≼",
  	"ReverseEquilibrium;": "⇋",
  	"RightDoubleBracket;": "⟧",
  	"RightDownTeeVector;": "⥝",
  	"RightDownVectorBar;": "⥕",
  	"RightTriangleEqual;": "⊵",
  	"SquareIntersection;": "⊓",
  	"SucceedsSlantEqual;": "≽",
  	"DoubleLongLeftArrow;": "⟸",
  	"DownLeftRightVector;": "⥐",
  	"LeftArrowRightArrow;": "⇆",
  	"leftrightsquigarrow;": "↭",
  	"NegativeMediumSpace;": "​",
  	"NotGreaterFullEqual;": "≧̸",
  	"NotRightTriangleBar;": "⧐̸",
  	"RightArrowLeftArrow;": "⇄",
  	"SquareSupersetEqual;": "⊒",
  	"CapitalDifferentialD;": "ⅅ",
  	"DoubleLeftRightArrow;": "⇔",
  	"DoubleLongRightArrow;": "⟹",
  	"EmptyVerySmallSquare;": "▫",
  	"NestedGreaterGreater;": "≫",
  	"NotDoubleVerticalBar;": "∦",
  	"NotGreaterSlantEqual;": "⩾̸",
  	"NotLeftTriangleEqual;": "⋬",
  	"NotSquareSubsetEqual;": "⋢",
  	"OpenCurlyDoubleQuote;": "“",
  	"ReverseUpEquilibrium;": "⥯",
  	"CloseCurlyDoubleQuote;": "”",
  	"DoubleContourIntegral;": "∯",
  	"FilledVerySmallSquare;": "▪",
  	"NegativeVeryThinSpace;": "​",
  	"NotPrecedesSlantEqual;": "⋠",
  	"NotRightTriangleEqual;": "⋭",
  	"NotSucceedsSlantEqual;": "⋡",
  	"DiacriticalDoubleAcute;": "˝",
  	"NotSquareSupersetEqual;": "⋣",
  	"NotNestedGreaterGreater;": "⪢̸",
  	"ClockwiseContourIntegral;": "∲",
  	"DoubleLongLeftRightArrow;": "⟺",
  	"CounterClockwiseContourIntegral;": "∳"
  };

  const parserOptionsStandard = {
      // extends the minimal options with more spec-compliant overrides
      ...parserOptionsMinimal,
      // https://html.spec.whatwg.org/multipage/named-characters.html#named-character-references
      namedCharacterReferences
  };

  // Parse inline CSS strings for static style attributes into an object.
  // This is a NodeTransform since it works on the static `style` attribute and
  // converts it into a dynamic equivalent:
  // style="color: red" -> :style='{ "color": "red" }'
  // It is then processed by `transformElement` and included in the generated
  // props.
  const transformStyle = (node, context) => {
      if (node.type === 1 /* ELEMENT */) {
          node.props.forEach((p, i) => {
              if (p.type === 6 /* ATTRIBUTE */ && p.name === 'style' && p.value) {
                  // replace p with an expression node
                  const parsed = JSON.stringify(parseInlineCSS(p.value.content));
                  const exp = context.hoist(createSimpleExpression(parsed, false, p.loc));
                  node.props[i] = {
                      type: 7 /* DIRECTIVE */,
                      name: `bind`,
                      arg: createSimpleExpression(`style`, true, p.loc),
                      exp,
                      modifiers: [],
                      loc: p.loc
                  };
              }
          });
      }
  };
  const listDelimiterRE = /;(?![^(]*\))/g;
  const propertyDelimiterRE = /:(.+)/;
  function parseInlineCSS(cssText) {
      const res = {};
      cssText.split(listDelimiterRE).forEach(function (item) {
          if (item) {
              const tmp = item.split(propertyDelimiterRE);
              tmp.length > 1 && (res[tmp[0].trim()] = tmp[1].trim());
          }
      });
      return res;
  }

  function compile(template, options = {}) {
      return baseCompile(template, {
          ...options,
          ...( parserOptionsStandard),
          nodeTransforms: [transformStyle, ...(options.nodeTransforms || [])],
          directiveTransforms: {
              // TODO include DOM-specific directiveTransforms
              ...(options.directiveTransforms || {})
          }
      });
  }

  // global immutability lock
  let LOCKED = true;
  function lock() {
      LOCKED = true;
  }
  function unlock() {
      LOCKED = false;
  }

  const builtInSymbols = new Set(Object.getOwnPropertyNames(Symbol)
      .map(key => Symbol[key])
      .filter(value => typeof value === 'symbol'));
  function createGetter(isReadonly) {
      return function get(target, key, receiver) {
          const res = Reflect.get(target, key, receiver);
          if (typeof key === 'symbol' && builtInSymbols.has(key)) {
              return res;
          }
          if (isRef(res)) {
              return res.value;
          }
          track(target, "get" /* GET */, key);
          return isObject(res)
              ? isReadonly
                  ? // need to lazy access readonly and reactive here to avoid
                      // circular dependency
                      readonly(res)
                  : reactive(res)
              : res;
      };
  }
  function set(target, key, value, receiver) {
      value = toRaw(value);
      const hadKey = hasOwn(target, key);
      const oldValue = target[key];
      if (isRef(oldValue) && !isRef(value)) {
          oldValue.value = value;
          return true;
      }
      const result = Reflect.set(target, key, value, receiver);
      // don't trigger if target is something up in the prototype chain of original
      if (target === toRaw(receiver)) {
          /* istanbul ignore else */
          {
              const extraInfo = { oldValue, newValue: value };
              if (!hadKey) {
                  trigger(target, "add" /* ADD */, key, extraInfo);
              }
              else if (value !== oldValue) {
                  trigger(target, "set" /* SET */, key, extraInfo);
              }
          }
      }
      return result;
  }
  function deleteProperty(target, key) {
      const hadKey = hasOwn(target, key);
      const oldValue = target[key];
      const result = Reflect.deleteProperty(target, key);
      if (hadKey) {
          /* istanbul ignore else */
          {
              trigger(target, "delete" /* DELETE */, key, { oldValue });
          }
      }
      return result;
  }
  function has(target, key) {
      const result = Reflect.has(target, key);
      track(target, "has" /* HAS */, key);
      return result;
  }
  function ownKeys(target) {
      track(target, "iterate" /* ITERATE */);
      return Reflect.ownKeys(target);
  }
  const mutableHandlers = {
      get: createGetter(false),
      set,
      deleteProperty,
      has,
      ownKeys
  };
  const readonlyHandlers = {
      get: createGetter(true),
      set(target, key, value, receiver) {
          if (LOCKED) {
              {
                  console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`, target);
              }
              return true;
          }
          else {
              return set(target, key, value, receiver);
          }
      },
      deleteProperty(target, key) {
          if (LOCKED) {
              {
                  console.warn(`Delete operation on key "${String(key)}" failed: target is readonly.`, target);
              }
              return true;
          }
          else {
              return deleteProperty(target, key);
          }
      },
      has,
      ownKeys
  };

  const toReactive = (value) => (isObject(value) ? reactive(value) : value);
  const toReadonly = (value) => (isObject(value) ? readonly(value) : value);
  function get(target, key, wrap) {
      target = toRaw(target);
      key = toRaw(key);
      const proto = Reflect.getPrototypeOf(target);
      track(target, "get" /* GET */, key);
      const res = proto.get.call(target, key);
      return wrap(res);
  }
  function has$1(key) {
      const target = toRaw(this);
      key = toRaw(key);
      const proto = Reflect.getPrototypeOf(target);
      track(target, "has" /* HAS */, key);
      return proto.has.call(target, key);
  }
  function size(target) {
      target = toRaw(target);
      const proto = Reflect.getPrototypeOf(target);
      track(target, "iterate" /* ITERATE */);
      return Reflect.get(proto, 'size', target);
  }
  function add(value) {
      value = toRaw(value);
      const target = toRaw(this);
      const proto = Reflect.getPrototypeOf(this);
      const hadKey = proto.has.call(target, value);
      const result = proto.add.call(target, value);
      if (!hadKey) {
          /* istanbul ignore else */
          {
              trigger(target, "add" /* ADD */, value, { value });
          }
      }
      return result;
  }
  function set$1(key, value) {
      value = toRaw(value);
      const target = toRaw(this);
      const proto = Reflect.getPrototypeOf(this);
      const hadKey = proto.has.call(target, key);
      const oldValue = proto.get.call(target, key);
      const result = proto.set.call(target, key, value);
      if (value !== oldValue) {
          /* istanbul ignore else */
          {
              const extraInfo = { oldValue, newValue: value };
              if (!hadKey) {
                  trigger(target, "add" /* ADD */, key, extraInfo);
              }
              else {
                  trigger(target, "set" /* SET */, key, extraInfo);
              }
          }
      }
      return result;
  }
  function deleteEntry(key) {
      const target = toRaw(this);
      const proto = Reflect.getPrototypeOf(this);
      const hadKey = proto.has.call(target, key);
      const oldValue = proto.get ? proto.get.call(target, key) : undefined;
      // forward the operation before queueing reactions
      const result = proto.delete.call(target, key);
      if (hadKey) {
          /* istanbul ignore else */
          {
              trigger(target, "delete" /* DELETE */, key, { oldValue });
          }
      }
      return result;
  }
  function clear() {
      const target = toRaw(this);
      const proto = Reflect.getPrototypeOf(this);
      const hadItems = target.size !== 0;
      const oldTarget = target instanceof Map ? new Map(target) : new Set(target);
      // forward the operation before queueing reactions
      const result = proto.clear.call(target);
      if (hadItems) {
          /* istanbul ignore else */
          {
              trigger(target, "clear" /* CLEAR */, void 0, { oldTarget });
          }
      }
      return result;
  }
  function createForEach(isReadonly) {
      return function forEach(callback, thisArg) {
          const observed = this;
          const target = toRaw(observed);
          const proto = Reflect.getPrototypeOf(target);
          const wrap = isReadonly ? toReadonly : toReactive;
          track(target, "iterate" /* ITERATE */);
          // important: create sure the callback is
          // 1. invoked with the reactive map as `this` and 3rd arg
          // 2. the value received should be a corresponding reactive/readonly.
          function wrappedCallback(value, key) {
              return callback.call(observed, wrap(value), wrap(key), observed);
          }
          return proto.forEach.call(target, wrappedCallback, thisArg);
      };
  }
  function createIterableMethod(method, isReadonly) {
      return function (...args) {
          const target = toRaw(this);
          const proto = Reflect.getPrototypeOf(target);
          const isPair = method === 'entries' ||
              (method === Symbol.iterator && target instanceof Map);
          const innerIterator = proto[method].apply(target, args);
          const wrap = isReadonly ? toReadonly : toReactive;
          track(target, "iterate" /* ITERATE */);
          // return a wrapped iterator which returns observed versions of the
          // values emitted from the real iterator
          return {
              // iterator protocol
              next() {
                  const { value, done } = innerIterator.next();
                  return done
                      ? { value, done }
                      : {
                          value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
                          done
                      };
              },
              // iterable protocol
              [Symbol.iterator]() {
                  return this;
              }
          };
      };
  }
  function createReadonlyMethod(method, type) {
      return function (...args) {
          if (LOCKED) {
              {
                  const key = args[0] ? `on key "${args[0]}" ` : ``;
                  console.warn(`${capitalize(type)} operation ${key}failed: target is readonly.`, toRaw(this));
              }
              return type === "delete" /* DELETE */ ? false : this;
          }
          else {
              return method.apply(this, args);
          }
      };
  }
  const mutableInstrumentations = {
      get(key) {
          return get(this, key, toReactive);
      },
      get size() {
          return size(this);
      },
      has: has$1,
      add,
      set: set$1,
      delete: deleteEntry,
      clear,
      forEach: createForEach(false)
  };
  const readonlyInstrumentations = {
      get(key) {
          return get(this, key, toReadonly);
      },
      get size() {
          return size(this);
      },
      has: has$1,
      add: createReadonlyMethod(add, "add" /* ADD */),
      set: createReadonlyMethod(set$1, "set" /* SET */),
      delete: createReadonlyMethod(deleteEntry, "delete" /* DELETE */),
      clear: createReadonlyMethod(clear, "clear" /* CLEAR */),
      forEach: createForEach(true)
  };
  const iteratorMethods = ['keys', 'values', 'entries', Symbol.iterator];
  iteratorMethods.forEach(method => {
      mutableInstrumentations[method] = createIterableMethod(method, false);
      readonlyInstrumentations[method] = createIterableMethod(method, true);
  });
  function createInstrumentationGetter(instrumentations) {
      return function getInstrumented(target, key, receiver) {
          target =
              hasOwn(instrumentations, key) && key in target ? instrumentations : target;
          return Reflect.get(target, key, receiver);
      };
  }
  const mutableCollectionHandlers = {
      get: createInstrumentationGetter(mutableInstrumentations)
  };
  const readonlyCollectionHandlers = {
      get: createInstrumentationGetter(readonlyInstrumentations)
  };

  const targetMap = new WeakMap();
  // WeakMaps that store {raw <-> observed} pairs.
  const rawToReactive = new WeakMap();
  const reactiveToRaw = new WeakMap();
  const rawToReadonly = new WeakMap();
  const readonlyToRaw = new WeakMap();
  // WeakSets for values that are marked readonly or non-reactive during
  // observable creation.
  const readonlyValues = new WeakSet();
  const nonReactiveValues = new WeakSet();
  const collectionTypes = new Set([Set, Map, WeakMap, WeakSet]);
  const observableValueRE = /^\[object (?:Object|Array|Map|Set|WeakMap|WeakSet)\]$/;
  const canObserve = (value) => {
      return (!value._isVue &&
          !value._isVNode &&
          observableValueRE.test(toTypeString(value)) &&
          !nonReactiveValues.has(value));
  };
  function reactive(target) {
      // if trying to observe a readonly proxy, return the readonly version.
      if (readonlyToRaw.has(target)) {
          return target;
      }
      // target is explicitly marked as readonly by user
      if (readonlyValues.has(target)) {
          return readonly(target);
      }
      return createReactiveObject(target, rawToReactive, reactiveToRaw, mutableHandlers, mutableCollectionHandlers);
  }
  function readonly(target) {
      // value is a mutable observable, retrieve its original and return
      // a readonly version.
      if (reactiveToRaw.has(target)) {
          target = reactiveToRaw.get(target);
      }
      return createReactiveObject(target, rawToReadonly, readonlyToRaw, readonlyHandlers, readonlyCollectionHandlers);
  }
  function createReactiveObject(target, toProxy, toRaw, baseHandlers, collectionHandlers) {
      if (!isObject(target)) {
          {
              console.warn(`value cannot be made reactive: ${String(target)}`);
          }
          return target;
      }
      // target already has corresponding Proxy
      let observed = toProxy.get(target);
      if (observed !== void 0) {
          return observed;
      }
      // target is already a Proxy
      if (toRaw.has(target)) {
          return target;
      }
      // only a whitelist of value types can be observed.
      if (!canObserve(target)) {
          return target;
      }
      const handlers = collectionTypes.has(target.constructor)
          ? collectionHandlers
          : baseHandlers;
      observed = new Proxy(target, handlers);
      toProxy.set(target, observed);
      toRaw.set(observed, target);
      if (!targetMap.has(target)) {
          targetMap.set(target, new Map());
      }
      return observed;
  }
  function isReactive(value) {
      return reactiveToRaw.has(value) || readonlyToRaw.has(value);
  }
  function toRaw(observed) {
      return reactiveToRaw.get(observed) || readonlyToRaw.get(observed) || observed;
  }

  const activeReactiveEffectStack = [];
  const ITERATE_KEY = Symbol('iterate');
  function effect(fn, options = EMPTY_OBJ) {
      if (fn.isEffect) {
          fn = fn.raw;
      }
      const effect = createReactiveEffect(fn, options);
      if (!options.lazy) {
          effect();
      }
      return effect;
  }
  function stop(effect) {
      if (effect.active) {
          cleanup(effect);
          if (effect.onStop) {
              effect.onStop();
          }
          effect.active = false;
      }
  }
  function createReactiveEffect(fn, options) {
      const effect = function effect(...args) {
          return run(effect, fn, args);
      };
      effect.isEffect = true;
      effect.active = true;
      effect.raw = fn;
      effect.scheduler = options.scheduler;
      effect.onTrack = options.onTrack;
      effect.onTrigger = options.onTrigger;
      effect.onStop = options.onStop;
      effect.computed = options.computed;
      effect.deps = [];
      return effect;
  }
  function run(effect, fn, args) {
      if (!effect.active) {
          return fn(...args);
      }
      if (activeReactiveEffectStack.indexOf(effect) === -1) {
          cleanup(effect);
          try {
              activeReactiveEffectStack.push(effect);
              return fn(...args);
          }
          finally {
              activeReactiveEffectStack.pop();
          }
      }
  }
  function cleanup(effect) {
      const { deps } = effect;
      if (deps.length) {
          for (let i = 0; i < deps.length; i++) {
              deps[i].delete(effect);
          }
          deps.length = 0;
      }
  }
  let shouldTrack = true;
  function pauseTracking() {
      shouldTrack = false;
  }
  function resumeTracking() {
      shouldTrack = true;
  }
  function track(target, type, key) {
      if (!shouldTrack) {
          return;
      }
      const effect = activeReactiveEffectStack[activeReactiveEffectStack.length - 1];
      if (effect) {
          if (type === "iterate" /* ITERATE */) {
              key = ITERATE_KEY;
          }
          let depsMap = targetMap.get(target);
          if (depsMap === void 0) {
              targetMap.set(target, (depsMap = new Map()));
          }
          let dep = depsMap.get(key);
          if (dep === void 0) {
              depsMap.set(key, (dep = new Set()));
          }
          if (!dep.has(effect)) {
              dep.add(effect);
              effect.deps.push(dep);
              if ( effect.onTrack) {
                  effect.onTrack({
                      effect,
                      target,
                      type,
                      key
                  });
              }
          }
      }
  }
  function trigger(target, type, key, extraInfo) {
      const depsMap = targetMap.get(target);
      if (depsMap === void 0) {
          // never been tracked
          return;
      }
      const effects = new Set();
      const computedRunners = new Set();
      if (type === "clear" /* CLEAR */) {
          // collection being cleared, trigger all effects for target
          depsMap.forEach(dep => {
              addRunners(effects, computedRunners, dep);
          });
      }
      else {
          // schedule runs for SET | ADD | DELETE
          if (key !== void 0) {
              addRunners(effects, computedRunners, depsMap.get(key));
          }
          // also run for iteration key on ADD | DELETE
          if (type === "add" /* ADD */ || type === "delete" /* DELETE */) {
              const iterationKey = Array.isArray(target) ? 'length' : ITERATE_KEY;
              addRunners(effects, computedRunners, depsMap.get(iterationKey));
          }
      }
      const run = (effect) => {
          scheduleRun(effect, target, type, key, extraInfo);
      };
      // Important: computed effects must be run first so that computed getters
      // can be invalidated before any normal effects that depend on them are run.
      computedRunners.forEach(run);
      effects.forEach(run);
  }
  function addRunners(effects, computedRunners, effectsToAdd) {
      if (effectsToAdd !== void 0) {
          effectsToAdd.forEach(effect => {
              if (effect.computed) {
                  computedRunners.add(effect);
              }
              else {
                  effects.add(effect);
              }
          });
      }
  }
  function scheduleRun(effect, target, type, key, extraInfo) {
      if ( effect.onTrigger) {
          effect.onTrigger(extend({
              effect,
              target,
              key,
              type
          }, extraInfo));
      }
      if (effect.scheduler !== void 0) {
          effect.scheduler(effect);
      }
      else {
          effect();
      }
  }

  const refSymbol = Symbol( 'refSymbol' );
  function isRef(v) {
      return v ? v[refSymbol] === true : false;
  }

  function computed(getterOrOptions) {
      const isReadonly = isFunction(getterOrOptions);
      const getter = isReadonly
          ? getterOrOptions
          : getterOrOptions.get;
      const setter = isReadonly
          ? () => {
              // TODO warn attempting to mutate readonly computed value
          }
          : getterOrOptions.set;
      let dirty = true;
      let value;
      const runner = effect(getter, {
          lazy: true,
          // mark effect as computed so that it gets priority during trigger
          computed: true,
          scheduler: () => {
              dirty = true;
          }
      });
      return {
          [refSymbol]: true,
          // expose effect so computed can be stopped
          effect: runner,
          get value() {
              if (dirty) {
                  value = runner();
                  dirty = false;
              }
              // When computed effects are accessed in a parent effect, the parent
              // should track all the dependencies the computed property has tracked.
              // This should also apply for chained computed properties.
              trackChildRun(runner);
              return value;
          },
          set value(newValue) {
              setter(newValue);
          }
      };
  }
  function trackChildRun(childRunner) {
      const parentRunner = activeReactiveEffectStack[activeReactiveEffectStack.length - 1];
      if (parentRunner) {
          for (let i = 0; i < childRunner.deps.length; i++) {
              const dep = childRunner.deps[i];
              if (!dep.has(parentRunner)) {
                  dep.add(parentRunner);
                  parentRunner.deps.push(dep);
              }
          }
      }
  }

  let stack = [];
  function pushWarningContext(vnode) {
      stack.push(vnode);
  }
  function popWarningContext() {
      stack.pop();
  }
  function warn(msg, ...args) {
      const instance = stack.length ? stack[stack.length - 1].component : null;
      const appWarnHandler = instance && instance.appContext.config.warnHandler;
      const trace = getComponentTrace();
      if (appWarnHandler) {
          appWarnHandler(msg + args.join(''), instance && instance.renderProxy, formatTrace(trace).join(''));
          return;
      }
      console.warn(`[Vue warn]: ${msg}`, ...args);
      // avoid spamming console during tests
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
          return;
      }
      if (!trace.length) {
          return;
      }
      if (trace.length > 1 && console.groupCollapsed) {
          console.groupCollapsed('at', ...formatTraceEntry(trace[0]));
          const logs = [];
          trace.slice(1).forEach((entry, i) => {
              if (i !== 0)
                  logs.push('\n');
              logs.push(...formatTraceEntry(entry, i + 1));
          });
          console.log(...logs);
          console.groupEnd();
      }
      else {
          console.log(...formatTrace(trace));
      }
  }
  function getComponentTrace() {
      let currentVNode = stack[stack.length - 1];
      if (!currentVNode) {
          return [];
      }
      // we can't just use the stack because it will be incomplete during updates
      // that did not start from the root. Re-construct the parent chain using
      // instance parent pointers.
      const normalizedStack = [];
      while (currentVNode) {
          const last = normalizedStack[0];
          if (last && last.vnode === currentVNode) {
              last.recurseCount++;
          }
          else {
              normalizedStack.push({
                  vnode: currentVNode,
                  recurseCount: 0
              });
          }
          const parentInstance = currentVNode.component
              .parent;
          currentVNode = parentInstance && parentInstance.vnode;
      }
      return normalizedStack;
  }
  function formatTrace(trace) {
      const logs = [];
      trace.forEach((entry, i) => {
          const formatted = formatTraceEntry(entry, i);
          if (i === 0) {
              logs.push('at', ...formatted);
          }
          else {
              logs.push('\n', ...formatted);
          }
      });
      return logs;
  }
  function formatTraceEntry({ vnode, recurseCount }, depth = 0) {
      const padding = depth === 0 ? '' : ' '.repeat(depth * 2 + 1);
      const postfix = recurseCount > 0 ? `... (${recurseCount} recursive calls)` : ``;
      const open = padding + `<${formatComponentName(vnode)}`;
      const close = `>` + postfix;
      const rootLabel = vnode.component.parent == null ? `(Root)` : ``;
      return vnode.props
          ? [open, ...formatProps(vnode.props), close, rootLabel]
          : [open + close, rootLabel];
  }
  const classifyRE = /(?:^|[-_])(\w)/g;
  const classify = (str) => str.replace(classifyRE, c => c.toUpperCase()).replace(/[-_]/g, '');
  function formatComponentName(vnode, file) {
      const Component = vnode.type;
      let name = Component.displayName || Component.name;
      if (!name && file) {
          const match = file.match(/([^/\\]+)\.vue$/);
          if (match) {
              name = match[1];
          }
      }
      return name ? classify(name) : 'AnonymousComponent';
  }
  function formatProps(props) {
      const res = [];
      for (const key in props) {
          const value = props[key];
          if (isString(value)) {
              res.push(`${key}=${JSON.stringify(value)}`);
          }
          else {
              res.push(`${key}=`, toRaw(value));
          }
      }
      return res;
  }

  const ErrorTypeStrings = {
      ["bc" /* BEFORE_CREATE */]: 'beforeCreate hook',
      ["c" /* CREATED */]: 'created hook',
      ["bm" /* BEFORE_MOUNT */]: 'beforeMount hook',
      ["m" /* MOUNTED */]: 'mounted hook',
      ["bu" /* BEFORE_UPDATE */]: 'beforeUpdate hook',
      ["u" /* UPDATED */]: 'updated',
      ["bum" /* BEFORE_UNMOUNT */]: 'beforeUnmount hook',
      ["um" /* UNMOUNTED */]: 'unmounted hook',
      ["a" /* ACTIVATED */]: 'activated hook',
      ["da" /* DEACTIVATED */]: 'deactivated hook',
      ["ec" /* ERROR_CAPTURED */]: 'errorCaptured hook',
      ["rtc" /* RENDER_TRACKED */]: 'renderTracked hook',
      ["rtg" /* RENDER_TRIGGERED */]: 'renderTriggered hook',
      [0 /* SETUP_FUNCTION */]: 'setup function',
      [1 /* RENDER_FUNCTION */]: 'render function',
      [2 /* WATCH_GETTER */]: 'watcher getter',
      [3 /* WATCH_CALLBACK */]: 'watcher callback',
      [4 /* WATCH_CLEANUP */]: 'watcher cleanup function',
      [5 /* NATIVE_EVENT_HANDLER */]: 'native event handler',
      [6 /* COMPONENT_EVENT_HANDLER */]: 'component event handler',
      [7 /* DIRECTIVE_HOOK */]: 'directive hook',
      [8 /* APP_ERROR_HANDLER */]: 'app errorHandler',
      [9 /* APP_WARN_HANDLER */]: 'app warnHandler',
      [10 /* SCHEDULER */]: 'scheduler flush. This is likely a Vue internals bug. ' +
          'Please open an issue at https://new-issue.vuejs.org/?repo=vuejs/vue'
  };
  function callWithErrorHandling(fn, instance, type, args) {
      let res;
      try {
          res = args ? fn(...args) : fn();
      }
      catch (err) {
          handleError(err, instance, type);
      }
      return res;
  }
  function callWithAsyncErrorHandling(fn, instance, type, args) {
      const res = callWithErrorHandling(fn, instance, type, args);
      if (res != null && !res._isVue && typeof res.then === 'function') {
          res.catch((err) => {
              handleError(err, instance, type);
          });
      }
      return res;
  }
  function handleError(err, instance, type) {
      const contextVNode = instance ? instance.vnode : null;
      if (instance) {
          let cur = instance.parent;
          // the exposed instance is the render proxy to keep it consistent with 2.x
          const exposedInstance = instance.renderProxy;
          // in production the hook receives only the error code
          const errorInfo =  ErrorTypeStrings[type] ;
          while (cur) {
              const errorCapturedHooks = cur.ec;
              if (errorCapturedHooks !== null) {
                  for (let i = 0; i < errorCapturedHooks.length; i++) {
                      if (errorCapturedHooks[i](err, exposedInstance, errorInfo)) {
                          return;
                      }
                  }
              }
              cur = cur.parent;
          }
          // app-level handling
          const appErrorHandler = instance.appContext.config.errorHandler;
          if (appErrorHandler) {
              callWithErrorHandling(appErrorHandler, null, 8 /* APP_ERROR_HANDLER */, [err, exposedInstance, errorInfo]);
              return;
          }
      }
      logError(err, type, contextVNode);
  }
  function logError(err, type, contextVNode) {
      // default behavior is crash in prod & test, recover in dev.
      // TODO we should probably make this configurable via `createApp`
      if (
          !(typeof process !== 'undefined' && process.env.NODE_ENV === 'test')) {
          const info = ErrorTypeStrings[type];
          if (contextVNode) {
              pushWarningContext(contextVNode);
          }
          warn(`Unhandled error${info ? ` during execution of ${info}` : ``}`);
          console.error(err);
          if (contextVNode) {
              popWarningContext();
          }
      }
      else {
          throw err;
      }
  }

  const queue = [];
  const postFlushCbs = [];
  const p = Promise.resolve();
  let isFlushing = false;
  function nextTick(fn) {
      return fn ? p.then(fn) : p;
  }
  function queueJob(job) {
      if (queue.indexOf(job) === -1) {
          queue.push(job);
          if (!isFlushing) {
              nextTick(flushJobs);
          }
      }
  }
  function queuePostFlushCb(cb) {
      if (Array.isArray(cb)) {
          postFlushCbs.push.apply(postFlushCbs, cb);
      }
      else {
          postFlushCbs.push(cb);
      }
      if (!isFlushing) {
          nextTick(flushJobs);
      }
  }
  const dedupe = (cbs) => Array.from(new Set(cbs));
  function flushPostFlushCbs() {
      if (postFlushCbs.length) {
          const cbs = dedupe(postFlushCbs);
          postFlushCbs.length = 0;
          for (let i = 0; i < cbs.length; i++) {
              cbs[i]();
          }
      }
  }
  const RECURSION_LIMIT = 100;
  function flushJobs(seenJobs) {
      isFlushing = true;
      let job;
      {
          seenJobs = seenJobs || new Map();
      }
      while ((job = queue.shift())) {
          {
              const seen = seenJobs;
              if (!seen.has(job)) {
                  seen.set(job, 1);
              }
              else {
                  const count = seen.get(job);
                  if (count > RECURSION_LIMIT) {
                      throw new Error('Maximum recursive updates exceeded. ' +
                          "You may have code that is mutating state in your component's " +
                          'render function or updated hook.');
                  }
                  else {
                      seen.set(job, count + 1);
                  }
              }
          }
          try {
              job();
          }
          catch (err) {
              handleError(err, null, 10 /* SCHEDULER */);
          }
      }
      flushPostFlushCbs();
      isFlushing = false;
      // some postFlushCb queued jobs!
      // keep flushing until it drains.
      if (queue.length) {
          flushJobs(seenJobs);
      }
  }

  const Fragment =  Symbol('Fragment') ;
  const Text =  Symbol('Text') ;
  const Comment =  Symbol('Empty') ;
  const Portal =  Symbol('Portal') ;
  const Suspense =  Symbol('Suspense') ;
  // Since v-if and v-for are the two possible ways node structure can dynamically
  // change, once we consider v-if branches and each v-for fragment a block, we
  // can divide a template into nested blocks, and within each block the node
  // structure would be stable. This allows us to skip most children diffing
  // and only worry about the dynamic nodes (indicated by patch flags).
  const blockStack = [];
  let shouldTrack$1 = true;
  function isVNode(value) {
      return value ? value._isVNode === true : false;
  }
  function createVNode(type, props = null, children = null, patchFlag = 0, dynamicProps = null) {
      // class & style normalization.
      if (props !== null) {
          // for reactive or proxy objects, we need to clone it to enable mutation.
          if (isReactive(props) || SetupProxySymbol in props) {
              props = extend({}, props);
          }
          // class normalization only needed if the vnode isn't generated by
          // compiler-optimized code
          if (props.class != null && !(patchFlag & 2 /* CLASS */)) {
              props.class = normalizeClass(props.class);
          }
          let { style } = props;
          if (style != null) {
              // reactive state objects need to be cloned since they are likely to be
              // mutated
              if (isReactive(style) && !isArray(style)) {
                  style = extend({}, style);
              }
              props.style = normalizeStyle(style);
          }
      }
      // encode the vnode type information into a bitmap
      const shapeFlag = isString(type)
          ? 1 /* ELEMENT */
          : isObject(type)
              ? 4 /* STATEFUL_COMPONENT */
              : isFunction(type)
                  ? 2 /* FUNCTIONAL_COMPONENT */
                  : 0;
      const vnode = {
          _isVNode: true,
          type,
          props,
          key: (props && props.key) || null,
          ref: (props && props.ref) || null,
          children: null,
          component: null,
          suspense: null,
          el: null,
          anchor: null,
          target: null,
          shapeFlag,
          patchFlag,
          dynamicProps,
          dynamicChildren: null,
          appContext: null
      };
      normalizeChildren(vnode, children);
      // presence of a patch flag indicates this node needs patching on updates.
      // component nodes also should always be patched, because even if the
      // component doesn't need to update, it needs to persist the instance on to
      // the next vnode so that it can be properly unmounted later.
      if (shouldTrack$1 &&
          (patchFlag ||
              shapeFlag & 4 /* STATEFUL_COMPONENT */ ||
              shapeFlag & 2 /* FUNCTIONAL_COMPONENT */)) {
          trackDynamicNode(vnode);
      }
      return vnode;
  }
  function trackDynamicNode(vnode) {
      const currentBlockDynamicNodes = blockStack[blockStack.length - 1];
      if (currentBlockDynamicNodes != null) {
          currentBlockDynamicNodes.push(vnode);
      }
  }
  function cloneVNode(vnode) {
      return {
          _isVNode: true,
          type: vnode.type,
          props: vnode.props,
          key: vnode.key,
          ref: vnode.ref,
          children: vnode.children,
          target: vnode.target,
          shapeFlag: vnode.shapeFlag,
          patchFlag: vnode.patchFlag,
          dynamicProps: vnode.dynamicProps,
          dynamicChildren: vnode.dynamicChildren,
          appContext: vnode.appContext,
          // these should be set to null since they should only be present on
          // mounted VNodes. If they are somehow not null, this means we have
          // encountered an already-mounted vnode being used again.
          component: null,
          suspense: null,
          el: null,
          anchor: null
      };
  }
  function normalizeVNode(child) {
      if (child == null) {
          // empty placeholder
          return createVNode(Comment);
      }
      else if (isArray(child)) {
          // fragment
          return createVNode(Fragment, null, child);
      }
      else if (typeof child === 'object') {
          // already vnode, this should be the most common since compiled templates
          // always produce all-vnode children arrays
          return child.el === null ? child : cloneVNode(child);
      }
      else {
          // primitive types
          return createVNode(Text, null, child + '');
      }
  }
  function normalizeChildren(vnode, children) {
      let type = 0;
      if (children == null) {
          children = null;
      }
      else if (isArray(children)) {
          type = 16 /* ARRAY_CHILDREN */;
      }
      else if (typeof children === 'object') {
          type = 32 /* SLOTS_CHILDREN */;
      }
      else if (isFunction(children)) {
          children = { default: children };
          type = 32 /* SLOTS_CHILDREN */;
      }
      else {
          children = isString(children) ? children : children + '';
          type = 8 /* TEXT_CHILDREN */;
      }
      vnode.children = children;
      vnode.shapeFlag |= type;
  }
  function normalizeStyle(value) {
      if (isArray(value)) {
          const res = {};
          for (let i = 0; i < value.length; i++) {
              const normalized = normalizeStyle(value[i]);
              if (normalized) {
                  for (const key in normalized) {
                      res[key] = normalized[key];
                  }
              }
          }
          return res;
      }
      else if (isObject(value)) {
          return value;
      }
  }
  function normalizeClass(value) {
      let res = '';
      if (isString(value)) {
          res = value;
      }
      else if (isArray(value)) {
          for (let i = 0; i < value.length; i++) {
              res += normalizeClass(value[i]) + ' ';
          }
      }
      else if (isObject(value)) {
          for (const name in value) {
              if (value[name]) {
                  res += name + ' ';
              }
          }
      }
      return res.trim();
  }

  function injectHook(type, hook, target) {
      if (target) {
          (target[type] || (target[type] = [])).push((...args) => {
              if (target.isUnmounted) {
                  return;
              }
              // disable tracking inside all lifecycle hooks
              // since they can potentially be called inside effects.
              pauseTracking();
              // Set currentInstance during hook invocation.
              // This assumes the hook does not synchronously trigger other hooks, which
              // can only be false when the user does something really funky.
              setCurrentInstance(target);
              const res = callWithAsyncErrorHandling(hook, target, type, args);
              setCurrentInstance(null);
              resumeTracking();
              return res;
          });
      }
      else {
          const apiName = `on${capitalize(ErrorTypeStrings[type].replace(/ hook$/, ''))}`;
          warn(`${apiName} is called when there is no active component instance to be ` +
              `associated with. ` +
              `Lifecycle injection APIs can only be used during execution of setup().` +
              ( ` If you are using async setup(), make sure to register lifecycle ` +
                      `hooks before the first await statement.`
                  ));
      }
  }
  function onBeforeMount(hook, target = currentInstance) {
      injectHook("bm" /* BEFORE_MOUNT */, hook, target);
  }
  function onMounted(hook, target = currentInstance) {
      injectHook("m" /* MOUNTED */, hook, target);
  }
  function onBeforeUpdate(hook, target = currentInstance) {
      injectHook("bu" /* BEFORE_UPDATE */, hook, target);
  }
  function onUpdated(hook, target = currentInstance) {
      injectHook("u" /* UPDATED */, hook, target);
  }
  function onBeforeUnmount(hook, target = currentInstance) {
      injectHook("bum" /* BEFORE_UNMOUNT */, hook, target);
  }
  function onUnmounted(hook, target = currentInstance) {
      injectHook("um" /* UNMOUNTED */, hook, target);
  }
  function onRenderTriggered(hook, target = currentInstance) {
      injectHook("rtg" /* RENDER_TRIGGERED */, hook, target);
  }
  function onRenderTracked(hook, target = currentInstance) {
      injectHook("rtc" /* RENDER_TRACKED */, hook, target);
  }
  function onErrorCaptured(hook, target = currentInstance) {
      injectHook("ec" /* ERROR_CAPTURED */, hook, target);
  }

  function renderComponentRoot(instance) {
      const { type: Component, vnode, renderProxy, props, slots, attrs, emit } = instance;
      let result;
      try {
          if (vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */) {
              result = normalizeVNode(instance.render.call(renderProxy));
          }
          else {
              // functional
              const render = Component;
              result = normalizeVNode(render.length > 1
                  ? render(props, {
                      attrs,
                      slots,
                      emit
                  })
                  : render(props, null));
          }
      }
      catch (err) {
          handleError(err, instance, 1 /* RENDER_FUNCTION */);
          result = createVNode(Comment);
      }
      return result;
  }
  function shouldUpdateComponent(prevVNode, nextVNode, optimized) {
      const { props: prevProps, children: prevChildren } = prevVNode;
      const { props: nextProps, children: nextChildren, patchFlag } = nextVNode;
      if (patchFlag > 0) {
          if (patchFlag & 256 /* DYNAMIC_SLOTS */) {
              // slot content that references values that might have changed,
              // e.g. in a v-for
              return true;
          }
          if (patchFlag & 16 /* FULL_PROPS */) {
              // presence of this flag indicates props are always non-null
              return hasPropsChanged(prevProps, nextProps);
          }
          else if (patchFlag & 8 /* PROPS */) {
              const dynamicProps = nextVNode.dynamicProps;
              for (let i = 0; i < dynamicProps.length; i++) {
                  const key = dynamicProps[i];
                  if (nextProps[key] !== prevProps[key]) {
                      return true;
                  }
              }
          }
      }
      else if (!optimized) {
          // this path is only taken by manually written render functions
          // so presence of any children leads to a forced update
          if (prevChildren != null || nextChildren != null) {
              return true;
          }
          if (prevProps === nextProps) {
              return false;
          }
          if (prevProps === null) {
              return nextProps !== null;
          }
          if (nextProps === null) {
              return prevProps !== null;
          }
          return hasPropsChanged(prevProps, nextProps);
      }
      return false;
  }
  function hasPropsChanged(prevProps, nextProps) {
      const nextKeys = Object.keys(nextProps);
      if (nextKeys.length !== Object.keys(prevProps).length) {
          return true;
      }
      for (let i = 0; i < nextKeys.length; i++) {
          const key = nextKeys[i];
          if (nextProps[key] !== prevProps[key]) {
              return true;
          }
      }
      return false;
  }

  // resolve raw VNode data.
  // - filter out reserved keys (key, ref, slots)
  // - extract class and style into $attrs (to be merged onto child
  //   component root)
  // - for the rest:
  //   - if has declared props: put declared ones in `props`, the rest in `attrs`
  //   - else: everything goes in `props`.
  function resolveProps(instance, rawProps, _options) {
      const hasDeclaredProps = _options != null;
      const options = normalizePropsOptions(_options);
      if (!rawProps && !hasDeclaredProps) {
          return;
      }
      const props = {};
      let attrs = void 0;
      // update the instance propsProxy (passed to setup()) to trigger potential
      // changes
      const propsProxy = instance.propsProxy;
      const setProp = propsProxy
          ? (key, val) => {
              props[key] = val;
              propsProxy[key] = val;
          }
          : (key, val) => {
              props[key] = val;
          };
      // allow mutation of propsProxy (which is readonly by default)
      unlock();
      if (rawProps != null) {
          for (const key in rawProps) {
              // key, ref are reserved
              if (isReservedProp(key))
                  continue;
              // any non-declared data are put into a separate `attrs` object
              // for spreading
              if (hasDeclaredProps && !hasOwn(options, key)) {
                  (attrs || (attrs = {}))[key] = rawProps[key];
              }
              else {
                  setProp(key, rawProps[key]);
              }
          }
      }
      // set default values, cast booleans & run validators
      if (hasDeclaredProps) {
          for (const key in options) {
              let opt = options[key];
              if (opt == null)
                  continue;
              const isAbsent = !hasOwn(props, key);
              const hasDefault = hasOwn(opt, 'default');
              const currentValue = props[key];
              // default values
              if (hasDefault && currentValue === undefined) {
                  const defaultValue = opt.default;
                  setProp(key, isFunction(defaultValue) ? defaultValue() : defaultValue);
              }
              // boolean casting
              if (opt["1" /* shouldCast */]) {
                  if (isAbsent && !hasDefault) {
                      setProp(key, false);
                  }
                  else if (opt["2" /* shouldCastTrue */] &&
                      (currentValue === '' || currentValue === hyphenate(key))) {
                      setProp(key, true);
                  }
              }
              // runtime validation
              if ( rawProps) {
                  validateProp(key, toRaw(rawProps[key]), opt, isAbsent);
              }
          }
      }
      else {
          // if component has no declared props, $attrs === $props
          attrs = props;
      }
      // in case of dynamic props, check if we need to delete keys from
      // the props proxy
      const { patchFlag } = instance.vnode;
      if (propsProxy !== null &&
          (patchFlag === 0 || patchFlag & 16 /* FULL_PROPS */)) {
          const rawInitialProps = toRaw(propsProxy);
          for (const key in rawInitialProps) {
              if (!hasOwn(props, key)) {
                  delete propsProxy[key];
              }
          }
      }
      // lock readonly
      lock();
      instance.props =  readonly(props) ;
      instance.attrs = options
          ?  attrs != null
              ? readonly(attrs)
              : attrs
          : instance.props;
  }
  const normalizationMap = new WeakMap();
  function normalizePropsOptions(raw) {
      if (!raw) {
          return null;
      }
      if (normalizationMap.has(raw)) {
          return normalizationMap.get(raw);
      }
      const normalized = {};
      normalizationMap.set(raw, normalized);
      if (isArray(raw)) {
          for (let i = 0; i < raw.length; i++) {
              if ( !isString(raw[i])) {
                  warn(`props must be strings when using array syntax.`, raw[i]);
              }
              const normalizedKey = camelize(raw[i]);
              if (normalizedKey[0] !== '$') {
                  normalized[normalizedKey] = EMPTY_OBJ;
              }
              else {
                  warn(`Invalid prop name: "${normalizedKey}" is a reserved property.`);
              }
          }
      }
      else {
          if ( !isObject(raw)) {
              warn(`invalid props options`, raw);
          }
          for (const key in raw) {
              const normalizedKey = camelize(key);
              if (normalizedKey[0] !== '$') {
                  const opt = raw[key];
                  const prop = (normalized[normalizedKey] =
                      isArray(opt) || isFunction(opt) ? { type: opt } : opt);
                  if (prop != null) {
                      const booleanIndex = getTypeIndex(Boolean, prop.type);
                      const stringIndex = getTypeIndex(String, prop.type);
                      prop["1" /* shouldCast */] = booleanIndex > -1;
                      prop["2" /* shouldCastTrue */] = booleanIndex < stringIndex;
                  }
              }
              else {
                  warn(`Invalid prop name: "${normalizedKey}" is a reserved property.`);
              }
          }
      }
      return normalized;
  }
  // use function string name to check type constructors
  // so that it works across vms / iframes.
  function getType(ctor) {
      const match = ctor && ctor.toString().match(/^\s*function (\w+)/);
      return match ? match[1] : '';
  }
  function isSameType(a, b) {
      return getType(a) === getType(b);
  }
  function getTypeIndex(type, expectedTypes) {
      if (isArray(expectedTypes)) {
          for (let i = 0, len = expectedTypes.length; i < len; i++) {
              if (isSameType(expectedTypes[i], type)) {
                  return i;
              }
          }
      }
      else if (isObject(expectedTypes)) {
          return isSameType(expectedTypes, type) ? 0 : -1;
      }
      return -1;
  }
  function validateProp(name, value, prop, isAbsent) {
      const { type, required, validator } = prop;
      // required!
      if (required && isAbsent) {
          warn('Missing required prop: "' + name + '"');
          return;
      }
      // missing but optional
      if (value == null && !prop.required) {
          return;
      }
      // type check
      if (type != null && type !== true) {
          let isValid = false;
          const types = isArray(type) ? type : [type];
          const expectedTypes = [];
          // value is valid as long as one of the specified types match
          for (let i = 0; i < types.length && !isValid; i++) {
              const { valid, expectedType } = assertType(value, types[i]);
              expectedTypes.push(expectedType || '');
              isValid = valid;
          }
          if (!isValid) {
              warn(getInvalidTypeMessage(name, value, expectedTypes));
              return;
          }
      }
      // custom validator
      if (validator && !validator(value)) {
          warn('Invalid prop: custom validator check failed for prop "' + name + '".');
      }
  }
  const simpleCheckRE = /^(String|Number|Boolean|Function|Symbol)$/;
  function assertType(value, type) {
      let valid;
      const expectedType = getType(type);
      if (simpleCheckRE.test(expectedType)) {
          const t = typeof value;
          valid = t === expectedType.toLowerCase();
          // for primitive wrapper objects
          if (!valid && t === 'object') {
              valid = value instanceof type;
          }
      }
      else if (expectedType === 'Object') {
          valid = toRawType(value) === 'Object';
      }
      else if (expectedType === 'Array') {
          valid = isArray(value);
      }
      else {
          valid = value instanceof type;
      }
      return {
          valid,
          expectedType
      };
  }
  function getInvalidTypeMessage(name, value, expectedTypes) {
      let message = `Invalid prop: type check failed for prop "${name}".` +
          ` Expected ${expectedTypes.map(capitalize).join(', ')}`;
      const expectedType = expectedTypes[0];
      const receivedType = toRawType(value);
      const expectedValue = styleValue(value, expectedType);
      const receivedValue = styleValue(value, receivedType);
      // check if we need to specify expected value
      if (expectedTypes.length === 1 &&
          isExplicable(expectedType) &&
          !isBoolean(expectedType, receivedType)) {
          message += ` with value ${expectedValue}`;
      }
      message += `, got ${receivedType} `;
      // check if we need to specify received value
      if (isExplicable(receivedType)) {
          message += `with value ${receivedValue}.`;
      }
      return message;
  }
  function styleValue(value, type) {
      if (type === 'String') {
          return `"${value}"`;
      }
      else if (type === 'Number') {
          return `${Number(value)}`;
      }
      else {
          return `${value}`;
      }
  }
  function toRawType(value) {
      return toTypeString(value).slice(8, -1);
  }
  function isExplicable(type) {
      const explicitTypes = ['string', 'number', 'boolean'];
      return explicitTypes.some(elem => type.toLowerCase() === elem);
  }
  function isBoolean(...args) {
      return args.some(elem => elem.toLowerCase() === 'boolean');
  }

  const normalizeSlotValue = (value) => isArray(value)
      ? value.map(normalizeVNode)
      : [normalizeVNode(value)];
  const normalizeSlot = (key, rawSlot) => (props) => {
      if ( currentInstance != null) {
          warn(`Slot "${key}" invoked outside of the render function: ` +
              `this will not track dependencies used in the slot. ` +
              `Invoke the slot function inside the render function instead.`);
      }
      return normalizeSlotValue(rawSlot(props));
  };
  function resolveSlots(instance, children) {
      let slots;
      if (instance.vnode.shapeFlag & 32 /* SLOTS_CHILDREN */) {
          if (children._compiled) {
              // pre-normalized slots object generated by compiler
              slots = children;
          }
          else {
              slots = {};
              for (const key in children) {
                  let value = children[key];
                  if (isFunction(value)) {
                      slots[key] = normalizeSlot(key, value);
                  }
                  else if (value != null) {
                      {
                          warn(`Non-function value encountered for slot "${key}". ` +
                              `Prefer function slots for better performance.`);
                      }
                      value = normalizeSlotValue(value);
                      slots[key] = () => value;
                  }
              }
          }
      }
      else if (children !== null) {
          // non slot object children (direct value) passed to a component
          {
              warn(`Non-function value encountered for default slot. ` +
                  `Prefer function slots for better performance.`);
          }
          const normalized = normalizeSlotValue(children);
          slots = { default: () => normalized };
      }
      if (slots !== void 0) {
          instance.slots = slots;
      }
  }

  /**
  Runtime helper for applying directives to a vnode. Example usage:

  const comp = resolveComponent('comp')
  const foo = resolveDirective('foo')
  const bar = resolveDirective('bar')

  return applyDirectives(h(comp), [
    [foo, this.x],
    [bar, this.y]
  ])
  */
  function invokeDirectiveHook(hook, instance, vnode, prevVNode = null) {
      const args = [vnode, prevVNode];
      if (isArray(hook)) {
          for (let i = 0; i < hook.length; i++) {
              callWithAsyncErrorHandling(hook[i], instance, 7 /* DIRECTIVE_HOOK */, args);
          }
      }
      else if (isFunction(hook)) {
          callWithAsyncErrorHandling(hook, instance, 7 /* DIRECTIVE_HOOK */, args);
      }
  }

  function createAppContext() {
      return {
          config: {
              devtools: true,
              performance: false,
              errorHandler: undefined,
              warnHandler: undefined
          },
          mixins: [],
          components: {},
          directives: {},
          provides: {}
      };
  }
  function createAppAPI(render) {
      return function createApp() {
          const context = createAppContext();
          let isMounted = false;
          const app = {
              get config() {
                  return context.config;
              },
              set config(v) {
                  {
                      warn(`app.config cannot be replaced. Modify individual options instead.`);
                  }
              },
              use(plugin) {
                  if (isFunction(plugin)) {
                      plugin(app);
                  }
                  else if (isFunction(plugin.install)) {
                      plugin.install(app);
                  }
                  else {
                      warn(`A plugin must either be a function or an object with an "install" ` +
                          `function.`);
                  }
                  return app;
              },
              mixin(mixin) {
                  context.mixins.push(mixin);
                  return app;
              },
              component(name, component) {
                  // TODO component name validation
                  if (!component) {
                      return context.components[name];
                  }
                  else {
                      context.components[name] = component;
                      return app;
                  }
              },
              directive(name, directive) {
                  // TODO directive name validation
                  if (!directive) {
                      return context.directives[name];
                  }
                  else {
                      context.directives[name] = directive;
                      return app;
                  }
              },
              mount(rootComponent, rootContainer, rootProps) {
                  if (!isMounted) {
                      const vnode = createVNode(rootComponent, rootProps);
                      // store app context on the root VNode.
                      // this will be set on the root instance on initial mount.
                      vnode.appContext = context;
                      render(vnode, rootContainer);
                      isMounted = true;
                      return vnode.component.renderProxy;
                  }
                  else {
                      warn(`App has already been mounted. Create a new app instance instead.`);
                  }
              },
              provide(key, value) {
                  if ( key in context.provides) {
                      warn(`App already provides property with key "${key}". ` +
                          `It will be overwritten with the new value.`);
                  }
                  context.provides[key] = value;
              }
          };
          return app;
      };
  }

  function createSuspenseBoundary(vnode, parent, parentComponent, container, hiddenContainer, anchor, isSVG, optimized) {
      return {
          vnode,
          parent,
          parentComponent,
          isSVG,
          optimized,
          container,
          hiddenContainer,
          anchor,
          deps: 0,
          subTree: null,
          fallbackTree: null,
          isResolved: false,
          isUnmounted: false,
          effects: []
      };
  }
  function normalizeSuspenseChildren(vnode) {
      const { shapeFlag, children } = vnode;
      if (shapeFlag & PublicShapeFlags.SLOTS_CHILDREN) {
          const { default: d, fallback } = children;
          return {
              content: normalizeVNode(isFunction(d) ? d() : d),
              fallback: normalizeVNode(isFunction(fallback) ? fallback() : fallback)
          };
      }
      else {
          return {
              content: normalizeVNode(children),
              fallback: normalizeVNode(null)
          };
      }
  }

  function createDevEffectOptions(instance) {
      return {
          scheduler: queueJob,
          onTrack: instance.rtc ? e => invokeHooks(instance.rtc, e) : void 0,
          onTrigger: instance.rtg ? e => invokeHooks(instance.rtg, e) : void 0
      };
  }
  function isSameType$1(n1, n2) {
      return n1.type === n2.type && n1.key === n2.key;
  }
  function invokeHooks(hooks, arg) {
      for (let i = 0; i < hooks.length; i++) {
          hooks[i](arg);
      }
  }
  function queuePostRenderEffect(fn, suspense) {
      if (suspense !== null && !suspense.isResolved) {
          if (isArray(fn)) {
              suspense.effects.push(...fn);
          }
          else {
              suspense.effects.push(fn);
          }
      }
      else {
          queuePostFlushCb(fn);
      }
  }
  /**
   * The createRenderer function accepts two generic arguments:
   * HostNode and HostElement, corresponding to Node and Element types in the
   * host environment. For example, for runtime-dom, HostNode would be the DOM
   * `Node` interface and HostElement would be the DOM `Element` interface.
   *
   * Custom renderers can pass in the platform specific types like this:
   *
   * ``` js
   * const { render, createApp } = createRenderer<Node, Element>({
   *   patchProp,
   *   ...nodeOps
   * })
   * ```
   */
  function createRenderer(options) {
      const { insert: hostInsert, remove: hostRemove, patchProp: hostPatchProp, createElement: hostCreateElement, createText: hostCreateText, createComment: hostCreateComment, setText: hostSetText, setElementText: hostSetElementText, parentNode: hostParentNode, nextSibling: hostNextSibling, querySelector: hostQuerySelector } = options;
      function patch(n1, // null means this is a mount
      n2, container, anchor = null, parentComponent = null, parentSuspense = null, isSVG = false, optimized = false) {
          // patching & not same type, unmount old tree
          if (n1 != null && !isSameType$1(n1, n2)) {
              anchor = getNextHostNode(n1);
              unmount(n1, parentComponent, parentSuspense, true);
              n1 = null;
          }
          const { type, shapeFlag } = n2;
          switch (type) {
              case Text:
                  processText(n1, n2, container, anchor);
                  break;
              case Comment:
                  processCommentNode(n1, n2, container, anchor);
                  break;
              case Fragment:
                  processFragment(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized);
                  break;
              case Portal:
                  processPortal(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized);
                  break;
              case Suspense:
                  {
                      processSuspense(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized);
                  }
                  break;
              default:
                  if (shapeFlag & 1 /* ELEMENT */) {
                      processElement(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized);
                  }
                  else if (shapeFlag & 6 /* COMPONENT */) {
                      processComponent(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized);
                  }
                  else {
                      warn('Invalid HostVNode type:', n2.type, `(${typeof n2.type})`);
                  }
          }
      }
      function processText(n1, n2, container, anchor) {
          if (n1 == null) {
              hostInsert((n2.el = hostCreateText(n2.children)), container, anchor);
          }
          else {
              const el = (n2.el = n1.el);
              if (n2.children !== n1.children) {
                  hostSetText(el, n2.children);
              }
          }
      }
      function processCommentNode(n1, n2, container, anchor) {
          if (n1 == null) {
              hostInsert((n2.el = hostCreateComment(n2.children || '')), container, anchor);
          }
          else {
              // there's no support for dynamic comments
              n2.el = n1.el;
          }
      }
      function processElement(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized) {
          if (n1 == null) {
              mountElement(n2, container, anchor, parentComponent, parentSuspense, isSVG);
          }
          else {
              patchElement(n1, n2, parentComponent, parentSuspense, isSVG, optimized);
          }
          if (n2.ref !== null && parentComponent !== null) {
              setRef(n2.ref, n1 && n1.ref, parentComponent, n2.el);
          }
      }
      function mountElement(vnode, container, anchor, parentComponent, parentSuspense, isSVG) {
          const tag = vnode.type;
          isSVG = isSVG || tag === 'svg';
          const el = (vnode.el = hostCreateElement(tag, isSVG));
          const { props, shapeFlag } = vnode;
          if (props != null) {
              for (const key in props) {
                  if (isReservedProp(key))
                      continue;
                  hostPatchProp(el, key, props[key], null, isSVG);
              }
              if (props.vnodeBeforeMount != null) {
                  invokeDirectiveHook(props.vnodeBeforeMount, parentComponent, vnode);
              }
          }
          if (shapeFlag & 8 /* TEXT_CHILDREN */) {
              hostSetElementText(el, vnode.children);
          }
          else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
              mountChildren(vnode.children, el, null, parentComponent, parentSuspense, isSVG);
          }
          hostInsert(el, container, anchor);
          if (props != null && props.vnodeMounted != null) {
              queuePostRenderEffect(() => {
                  invokeDirectiveHook(props.vnodeMounted, parentComponent, vnode);
              }, parentSuspense);
          }
      }
      function mountChildren(children, container, anchor, parentComponent, parentSuspense, isSVG, start = 0) {
          for (let i = start; i < children.length; i++) {
              const child = (children[i] = normalizeVNode(children[i]));
              patch(null, child, container, anchor, parentComponent, parentSuspense, isSVG);
          }
      }
      function patchElement(n1, n2, parentComponent, parentSuspense, isSVG, optimized) {
          const el = (n2.el = n1.el);
          const { patchFlag, dynamicChildren } = n2;
          const oldProps = (n1 && n1.props) || EMPTY_OBJ;
          const newProps = n2.props || EMPTY_OBJ;
          if (newProps.vnodeBeforeUpdate != null) {
              invokeDirectiveHook(newProps.vnodeBeforeUpdate, parentComponent, n2, n1);
          }
          if (patchFlag > 0) {
              // the presence of a patchFlag means this element's render code was
              // generated by the compiler and can take the fast path.
              // in this path old node and new node are guaranteed to have the same shape
              // (i.e. at the exact same position in the source template)
              if (patchFlag & 16 /* FULL_PROPS */) {
                  // element props contain dynamic keys, full diff needed
                  patchProps(el, n2, oldProps, newProps, parentComponent, parentSuspense, isSVG);
              }
              else {
                  // class
                  // this flag is matched when the element has dynamic class bindings.
                  if (patchFlag & 2 /* CLASS */) {
                      if (oldProps.class !== newProps.class) {
                          hostPatchProp(el, 'class', newProps.class, null, isSVG);
                      }
                  }
                  // style
                  // this flag is matched when the element has dynamic style bindings
                  if (patchFlag & 4 /* STYLE */) {
                      hostPatchProp(el, 'style', newProps.style, oldProps.style, isSVG);
                  }
                  // props
                  // This flag is matched when the element has dynamic prop/attr bindings
                  // other than class and style. The keys of dynamic prop/attrs are saved for
                  // faster iteration.
                  // Note dynamic keys like :[foo]="bar" will cause this optimization to
                  // bail out and go through a full diff because we need to unset the old key
                  if (patchFlag & 8 /* PROPS */) {
                      // if the flag is present then dynamicProps must be non-null
                      const propsToUpdate = n2.dynamicProps;
                      for (let i = 0; i < propsToUpdate.length; i++) {
                          const key = propsToUpdate[i];
                          const prev = oldProps[key];
                          const next = newProps[key];
                          if (prev !== next) {
                              hostPatchProp(el, key, next, prev, isSVG, n1.children, parentComponent, parentSuspense, unmountChildren);
                          }
                      }
                  }
              }
              // text
              // This flag is matched when the element has only dynamic text children.
              // this flag is terminal (i.e. skips children diffing).
              if (patchFlag & 1 /* TEXT */) {
                  if (n1.children !== n2.children) {
                      hostSetElementText(el, n2.children);
                  }
                  return; // terminal
              }
          }
          else if (!optimized) {
              // unoptimized, full diff
              patchProps(el, n2, oldProps, newProps, parentComponent, parentSuspense, isSVG);
          }
          if (dynamicChildren != null) {
              // children fast path
              const oldDynamicChildren = n1.dynamicChildren;
              for (let i = 0; i < dynamicChildren.length; i++) {
                  patch(oldDynamicChildren[i], dynamicChildren[i], el, null, parentComponent, parentSuspense, isSVG, true);
              }
          }
          else if (!optimized) {
              // full diff
              patchChildren(n1, n2, el, null, parentComponent, parentSuspense, isSVG);
          }
          if (newProps.vnodeUpdated != null) {
              queuePostRenderEffect(() => {
                  invokeDirectiveHook(newProps.vnodeUpdated, parentComponent, n2, n1);
              }, parentSuspense);
          }
      }
      function patchProps(el, vnode, oldProps, newProps, parentComponent, parentSuspense, isSVG) {
          if (oldProps !== newProps) {
              for (const key in newProps) {
                  if (isReservedProp(key))
                      continue;
                  const next = newProps[key];
                  const prev = oldProps[key];
                  if (next !== prev) {
                      hostPatchProp(el, key, next, prev, isSVG, vnode.children, parentComponent, parentSuspense, unmountChildren);
                  }
              }
              if (oldProps !== EMPTY_OBJ) {
                  for (const key in oldProps) {
                      if (isReservedProp(key))
                          continue;
                      if (!(key in newProps)) {
                          hostPatchProp(el, key, null, null, isSVG, vnode.children, parentComponent, parentSuspense, unmountChildren);
                      }
                  }
              }
          }
      }
      function processFragment(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized) {
          const fragmentStartAnchor = (n2.el = n1 ? n1.el : hostCreateComment(''));
          const fragmentEndAnchor = (n2.anchor = n1
              ? n1.anchor
              : hostCreateComment(''));
          if (n1 == null) {
              hostInsert(fragmentStartAnchor, container, anchor);
              hostInsert(fragmentEndAnchor, container, anchor);
              // a fragment can only have array children
              // since they are either generated by the compiler, or implicitly created
              // from arrays.
              mountChildren(n2.children, container, fragmentEndAnchor, parentComponent, parentSuspense, isSVG);
          }
          else {
              patchChildren(n1, n2, container, fragmentEndAnchor, parentComponent, parentSuspense, isSVG, optimized);
          }
      }
      function processPortal(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized) {
          const targetSelector = n2.props && n2.props.target;
          const { patchFlag, shapeFlag, children } = n2;
          if (n1 == null) {
              const target = (n2.target = isString(targetSelector)
                  ? hostQuerySelector(targetSelector)
                  : null);
              if (target != null) {
                  if (shapeFlag & 8 /* TEXT_CHILDREN */) {
                      hostSetElementText(target, children);
                  }
                  else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
                      mountChildren(children, target, null, parentComponent, parentSuspense, isSVG);
                  }
              }
              else {
                  warn('Invalid Portal target on mount:', target, `(${typeof target})`);
              }
          }
          else {
              // update content
              const target = (n2.target = n1.target);
              if (patchFlag === 1 /* TEXT */) {
                  hostSetElementText(target, children);
              }
              else if (!optimized) {
                  patchChildren(n1, n2, target, null, parentComponent, parentSuspense, isSVG);
              }
              // target changed
              if (targetSelector !== (n1.props && n1.props.target)) {
                  const nextTarget = (n2.target = isString(targetSelector)
                      ? hostQuerySelector(targetSelector)
                      : null);
                  if (nextTarget != null) {
                      // move content
                      if (shapeFlag & 8 /* TEXT_CHILDREN */) {
                          hostSetElementText(target, '');
                          hostSetElementText(nextTarget, children);
                      }
                      else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
                          for (let i = 0; i < children.length; i++) {
                              move(children[i], nextTarget, null);
                          }
                      }
                  }
                  else {
                      warn('Invalid Portal target on update:', target, `(${typeof target})`);
                  }
              }
          }
          // insert an empty node as the placeholder for the portal
          processCommentNode(n1, n2, container, anchor);
      }
      function processSuspense(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized) {
          if (n1 == null) {
              mountSuspense(n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized);
          }
          else {
              patchSuspense(n1, n2, container, anchor, parentComponent, isSVG, optimized);
          }
      }
      function mountSuspense(n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized) {
          const hiddenContainer = hostCreateElement('div');
          const suspense = (n2.suspense = createSuspenseBoundary(n2, parentSuspense, parentComponent, container, hiddenContainer, anchor, isSVG, optimized));
          const { content, fallback } = normalizeSuspenseChildren(n2);
          suspense.subTree = content;
          suspense.fallbackTree = fallback;
          // start mounting the content subtree in an off-dom container
          patch(null, content, hiddenContainer, null, parentComponent, suspense, isSVG, optimized);
          // now check if we have encountered any async deps
          if (suspense.deps > 0) {
              // mount the fallback tree
              patch(null, fallback, container, anchor, parentComponent, null, // fallback tree will not have suspense context
              isSVG, optimized);
              n2.el = fallback.el;
          }
          else {
              // Suspense has no async deps. Just resolve.
              resolveSuspense(suspense);
          }
      }
      function patchSuspense(n1, n2, container, anchor, parentComponent, isSVG, optimized) {
          const suspense = (n2.suspense = n1.suspense);
          suspense.vnode = n2;
          const { content, fallback } = normalizeSuspenseChildren(n2);
          const oldSubTree = suspense.subTree;
          const oldFallbackTree = suspense.fallbackTree;
          if (!suspense.isResolved) {
              patch(oldSubTree, content, suspense.hiddenContainer, null, parentComponent, suspense, isSVG, optimized);
              if (suspense.deps > 0) {
                  // still pending. patch the fallback tree.
                  patch(oldFallbackTree, fallback, container, anchor, parentComponent, null, // fallback tree will not have suspense context
                  isSVG, optimized);
                  n2.el = fallback.el;
              }
              // If deps somehow becomes 0 after the patch it means the patch caused an
              // async dep component to unmount and removed its dep. It will cause the
              // suspense to resolve and we don't need to do anything here.
          }
          else {
              // just normal patch inner content as a fragment
              patch(oldSubTree, content, container, anchor, parentComponent, suspense, isSVG, optimized);
              n2.el = content.el;
          }
          suspense.subTree = content;
          suspense.fallbackTree = fallback;
      }
      function resolveSuspense(suspense) {
          {
              if (suspense.isResolved) {
                  throw new Error(`resolveSuspense() is called on an already resolved suspense boundary.`);
              }
              if (suspense.isUnmounted) {
                  throw new Error(`resolveSuspense() is called on an already unmounted suspense boundary.`);
              }
          }
          const { vnode, subTree, fallbackTree, effects, parentComponent, container } = suspense;
          // this is initial anchor on mount
          let { anchor } = suspense;
          // unmount fallback tree
          if (fallbackTree.el) {
              // if the fallback tree was mounted, it may have been moved
              // as part of a parent suspense. get the latest anchor for insertion
              anchor = getNextHostNode(fallbackTree);
              unmount(fallbackTree, parentComponent, suspense, true);
          }
          // move content from off-dom container to actual container
          move(subTree, container, anchor);
          const el = (vnode.el = subTree.el);
          // suspense as the root node of a component...
          if (parentComponent && parentComponent.subTree === vnode) {
              parentComponent.vnode.el = el;
              updateHOCHostEl(parentComponent, el);
          }
          // check if there is a pending parent suspense
          let parent = suspense.parent;
          let hasUnresolvedAncestor = false;
          while (parent) {
              if (!parent.isResolved) {
                  // found a pending parent suspense, merge buffered post jobs
                  // into that parent
                  parent.effects.push(...effects);
                  hasUnresolvedAncestor = true;
                  break;
              }
              parent = parent.parent;
          }
          // no pending parent suspense, flush all jobs
          if (!hasUnresolvedAncestor) {
              queuePostFlushCb(effects);
          }
          suspense.isResolved = true;
          // invoke @resolve event
          const onResolve = vnode.props && vnode.props.onResolve;
          if (isFunction(onResolve)) {
              onResolve();
          }
      }
      function restartSuspense(suspense) {
          suspense.isResolved = false;
          const { vnode, subTree, fallbackTree, parentComponent, container, hiddenContainer, isSVG, optimized } = suspense;
          // move content tree back to the off-dom container
          const anchor = getNextHostNode(subTree);
          move(subTree, hiddenContainer, null);
          // remount the fallback tree
          patch(null, fallbackTree, container, anchor, parentComponent, null, // fallback tree will not have suspense context
          isSVG, optimized);
          const el = (vnode.el = fallbackTree.el);
          // suspense as the root node of a component...
          if (parentComponent && parentComponent.subTree === vnode) {
              parentComponent.vnode.el = el;
              updateHOCHostEl(parentComponent, el);
          }
          // invoke @suspense event
          const onSuspense = vnode.props && vnode.props.onSuspense;
          if (isFunction(onSuspense)) {
              onSuspense();
          }
      }
      function processComponent(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized) {
          if (n1 == null) {
              mountComponent(n2, container, anchor, parentComponent, parentSuspense, isSVG);
          }
          else {
              const instance = (n2.component = n1.component);
              if (shouldUpdateComponent(n1, n2, optimized)) {
                  if (
                      instance.asyncDep &&
                      !instance.asyncResolved) {
                      // async & still pending - just update props and slots
                      // since the component's reactive effect for render isn't set-up yet
                      {
                          pushWarningContext(n2);
                      }
                      updateComponentPreRender(instance, n2);
                      {
                          popWarningContext();
                      }
                      return;
                  }
                  else {
                      // normal update
                      instance.next = n2;
                      // instance.update is the reactive effect runner.
                      instance.update();
                  }
              }
              else {
                  // no update needed. just copy over properties
                  n2.component = n1.component;
                  n2.el = n1.el;
              }
          }
          if (n2.ref !== null && parentComponent !== null) {
              setRef(n2.ref, n1 && n1.ref, parentComponent, n2.component.renderProxy);
          }
      }
      function mountComponent(initialVNode, container, anchor, parentComponent, parentSuspense, isSVG) {
          const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent));
          {
              pushWarningContext(initialVNode);
          }
          // resolve props and slots for setup context
          const propsOptions = initialVNode.type.props;
          resolveProps(instance, initialVNode.props, propsOptions);
          resolveSlots(instance, initialVNode.children);
          // setup stateful logic
          if (initialVNode.shapeFlag & 4 /* STATEFUL_COMPONENT */) {
              setupStatefulComponent(instance, parentSuspense);
          }
          // setup() is async. This component relies on async logic to be resolved
          // before proceeding
          if ( instance.asyncDep) {
              if (!parentSuspense) {
                  // TODO handle this properly
                  throw new Error('Async component without a suspense boundary!');
              }
              // parent suspense already resolved, need to re-suspense
              // use queueJob so it's handled synchronously after patching the current
              // suspense tree
              if (parentSuspense.isResolved) {
                  queueJob(() => {
                      restartSuspense(parentSuspense);
                  });
              }
              parentSuspense.deps++;
              instance.asyncDep
                  .catch(err => {
                  handleError(err, instance, 0 /* SETUP_FUNCTION */);
              })
                  .then(asyncSetupResult => {
                  // component may be unmounted before resolve
                  if (!instance.isUnmounted && !parentSuspense.isUnmounted) {
                      retryAsyncComponent(instance, asyncSetupResult, parentSuspense, isSVG);
                  }
              });
              // give it a placeholder
              const placeholder = (instance.subTree = createVNode(Comment));
              processCommentNode(null, placeholder, container, anchor);
              initialVNode.el = placeholder.el;
              return;
          }
          setupRenderEffect(instance, parentSuspense, initialVNode, container, anchor, isSVG);
          {
              popWarningContext();
          }
      }
      function retryAsyncComponent(instance, asyncSetupResult, parentSuspense, isSVG) {
          parentSuspense.deps--;
          // retry from this component
          instance.asyncResolved = true;
          const { vnode } = instance;
          {
              pushWarningContext(vnode);
          }
          handleSetupResult(instance, asyncSetupResult, parentSuspense);
          setupRenderEffect(instance, parentSuspense, vnode, 
          // component may have been moved before resolve
          hostParentNode(instance.subTree.el), getNextHostNode(instance.subTree), isSVG);
          updateHOCHostEl(instance, vnode.el);
          {
              popWarningContext();
          }
          if (parentSuspense.deps === 0) {
              resolveSuspense(parentSuspense);
          }
      }
      function setupRenderEffect(instance, parentSuspense, initialVNode, container, anchor, isSVG) {
          // create reactive effect for rendering
          let mounted = false;
          instance.update = effect(function componentEffect() {
              if (!mounted) {
                  const subTree = (instance.subTree = renderComponentRoot(instance));
                  // beforeMount hook
                  if (instance.bm !== null) {
                      invokeHooks(instance.bm);
                  }
                  patch(null, subTree, container, anchor, instance, parentSuspense, isSVG);
                  initialVNode.el = subTree.el;
                  // mounted hook
                  if (instance.m !== null) {
                      queuePostRenderEffect(instance.m, parentSuspense);
                  }
                  mounted = true;
              }
              else {
                  // updateComponent
                  // This is triggered by mutation of component's own state (next: null)
                  // OR parent calling processComponent (next: HostVNode)
                  const { next } = instance;
                  {
                      pushWarningContext(next || instance.vnode);
                  }
                  if (next !== null) {
                      updateComponentPreRender(instance, next);
                  }
                  const prevTree = instance.subTree;
                  const nextTree = (instance.subTree = renderComponentRoot(instance));
                  // beforeUpdate hook
                  if (instance.bu !== null) {
                      invokeHooks(instance.bu);
                  }
                  // reset refs
                  // only needed if previous patch had refs
                  if (instance.refs !== EMPTY_OBJ) {
                      instance.refs = {};
                  }
                  patch(prevTree, nextTree, 
                  // parent may have changed if it's in a portal
                  hostParentNode(prevTree.el), 
                  // anchor may have changed if it's in a fragment
                  getNextHostNode(prevTree), instance, parentSuspense, isSVG);
                  instance.vnode.el = nextTree.el;
                  if (next === null) {
                      // self-triggered update. In case of HOC, update parent component
                      // vnode el. HOC is indicated by parent instance's subTree pointing
                      // to child component's vnode
                      updateHOCHostEl(instance, nextTree.el);
                  }
                  // updated hook
                  if (instance.u !== null) {
                      queuePostRenderEffect(instance.u, parentSuspense);
                  }
                  {
                      popWarningContext();
                  }
              }
          },  createDevEffectOptions(instance) );
      }
      function updateComponentPreRender(instance, nextVNode) {
          nextVNode.component = instance;
          instance.vnode = nextVNode;
          instance.next = null;
          resolveProps(instance, nextVNode.props, nextVNode.type.props);
          resolveSlots(instance, nextVNode.children);
      }
      function updateHOCHostEl({ vnode, parent }, el) {
          while (parent && parent.subTree === vnode) {
              (vnode = parent.vnode).el = el;
              parent = parent.parent;
          }
      }
      function patchChildren(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized = false) {
          const c1 = n1 && n1.children;
          const prevShapeFlag = n1 ? n1.shapeFlag : 0;
          const c2 = n2.children;
          const { patchFlag, shapeFlag } = n2;
          if (patchFlag === -1 /* BAIL */) {
              optimized = false;
          }
          // fast path
          if (patchFlag > 0) {
              if (patchFlag & 64 /* KEYED_FRAGMENT */) {
                  // this could be either fully-keyed or mixed (some keyed some not)
                  // presence of patchFlag means children are guaranteed to be arrays
                  patchKeyedChildren(c1, c2, container, anchor, parentComponent, parentSuspense, isSVG, optimized);
                  return;
              }
              else if (patchFlag & 128 /* UNKEYED_FRAGMENT */) {
                  // unkeyed
                  patchUnkeyedChildren(c1, c2, container, anchor, parentComponent, parentSuspense, isSVG, optimized);
                  return;
              }
          }
          // children has 3 possibilities: text, array or no children.
          if (shapeFlag & 8 /* TEXT_CHILDREN */) {
              // text children fast path
              if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) {
                  unmountChildren(c1, parentComponent, parentSuspense);
              }
              if (c2 !== c1) {
                  hostSetElementText(container, c2);
              }
          }
          else {
              if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) {
                  // prev children was array
                  if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
                      // two arrays, cannot assume anything, do full diff
                      patchKeyedChildren(c1, c2, container, anchor, parentComponent, parentSuspense, isSVG, optimized);
                  }
                  else {
                      // no new children, just unmount old
                      unmountChildren(c1, parentComponent, parentSuspense, true);
                  }
              }
              else {
                  // prev children was text OR null
                  // new children is array OR null
                  if (prevShapeFlag & 8 /* TEXT_CHILDREN */) {
                      hostSetElementText(container, '');
                  }
                  // mount new if array
                  if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
                      mountChildren(c2, container, anchor, parentComponent, parentSuspense, isSVG);
                  }
              }
          }
      }
      function patchUnkeyedChildren(c1, c2, container, anchor, parentComponent, parentSuspense, isSVG, optimized) {
          c1 = c1 || EMPTY_ARR;
          c2 = c2 || EMPTY_ARR;
          const oldLength = c1.length;
          const newLength = c2.length;
          const commonLength = Math.min(oldLength, newLength);
          let i;
          for (i = 0; i < commonLength; i++) {
              const nextChild = (c2[i] = normalizeVNode(c2[i]));
              patch(c1[i], nextChild, container, null, parentComponent, parentSuspense, isSVG, optimized);
          }
          if (oldLength > newLength) {
              // remove old
              unmountChildren(c1, parentComponent, parentSuspense, true, commonLength);
          }
          else {
              // mount new
              mountChildren(c2, container, anchor, parentComponent, parentSuspense, isSVG, commonLength);
          }
      }
      // can be all-keyed or mixed
      function patchKeyedChildren(c1, c2, container, parentAnchor, parentComponent, parentSuspense, isSVG, optimized) {
          let i = 0;
          const l2 = c2.length;
          let e1 = c1.length - 1; // prev ending index
          let e2 = l2 - 1; // next ending index
          // 1. sync from start
          // (a b) c
          // (a b) d e
          while (i <= e1 && i <= e2) {
              const n1 = c1[i];
              const n2 = (c2[i] = normalizeVNode(c2[i]));
              if (isSameType$1(n1, n2)) {
                  patch(n1, n2, container, parentAnchor, parentComponent, parentSuspense, isSVG, optimized);
              }
              else {
                  break;
              }
              i++;
          }
          // 2. sync from end
          // a (b c)
          // d e (b c)
          while (i <= e1 && i <= e2) {
              const n1 = c1[e1];
              const n2 = (c2[e2] = normalizeVNode(c2[e2]));
              if (isSameType$1(n1, n2)) {
                  patch(n1, n2, container, parentAnchor, parentComponent, parentSuspense, isSVG, optimized);
              }
              else {
                  break;
              }
              e1--;
              e2--;
          }
          // 3. common sequence + mount
          // (a b)
          // (a b) c
          // i = 2, e1 = 1, e2 = 2
          // (a b)
          // c (a b)
          // i = 0, e1 = -1, e2 = 0
          if (i > e1) {
              if (i <= e2) {
                  const nextPos = e2 + 1;
                  const anchor = nextPos < l2 ? c2[nextPos].el : parentAnchor;
                  while (i <= e2) {
                      patch(null, (c2[i] = normalizeVNode(c2[i])), container, anchor, parentComponent, parentSuspense, isSVG);
                      i++;
                  }
              }
          }
          // 4. common sequence + unmount
          // (a b) c
          // (a b)
          // i = 2, e1 = 2, e2 = 1
          // a (b c)
          // (b c)
          // i = 0, e1 = 0, e2 = -1
          else if (i > e2) {
              while (i <= e1) {
                  unmount(c1[i], parentComponent, parentSuspense, true);
                  i++;
              }
          }
          // 5. unknown sequence
          // [i ... e1 + 1]: a b [c d e] f g
          // [i ... e2 + 1]: a b [e d c h] f g
          // i = 2, e1 = 4, e2 = 5
          else {
              const s1 = i; // prev starting index
              const s2 = i; // next starting index
              // 5.1 build key:index map for newChildren
              const keyToNewIndexMap = new Map();
              for (i = s2; i <= e2; i++) {
                  const nextChild = (c2[i] = normalizeVNode(c2[i]));
                  if (nextChild.key != null) {
                      if ( keyToNewIndexMap.has(nextChild.key)) {
                          warn(`Duplicate keys found during update:`, JSON.stringify(nextChild.key), `Make sure keys are unique.`);
                      }
                      keyToNewIndexMap.set(nextChild.key, i);
                  }
              }
              // 5.2 loop through old children left to be patched and try to patch
              // matching nodes & remove nodes that are no longer present
              let j;
              let patched = 0;
              const toBePatched = e2 - s2 + 1;
              let moved = false;
              // used to track whether any node has moved
              let maxNewIndexSoFar = 0;
              // works as Map<newIndex, oldIndex>
              // Note that oldIndex is offset by +1
              // and oldIndex = 0 is a special value indicating the new node has
              // no corresponding old node.
              // used for determining longest stable subsequence
              const newIndexToOldIndexMap = [];
              for (i = 0; i < toBePatched; i++)
                  newIndexToOldIndexMap.push(0);
              for (i = s1; i <= e1; i++) {
                  const prevChild = c1[i];
                  if (patched >= toBePatched) {
                      // all new children have been patched so this can only be a removal
                      unmount(prevChild, parentComponent, parentSuspense, true);
                      continue;
                  }
                  let newIndex;
                  if (prevChild.key != null) {
                      newIndex = keyToNewIndexMap.get(prevChild.key);
                  }
                  else {
                      // key-less node, try to locate a key-less node of the same type
                      for (j = s2; j <= e2; j++) {
                          if (newIndexToOldIndexMap[j - s2] === 0 &&
                              isSameType$1(prevChild, c2[j])) {
                              newIndex = j;
                              break;
                          }
                      }
                  }
                  if (newIndex === undefined) {
                      unmount(prevChild, parentComponent, parentSuspense, true);
                  }
                  else {
                      newIndexToOldIndexMap[newIndex - s2] = i + 1;
                      if (newIndex >= maxNewIndexSoFar) {
                          maxNewIndexSoFar = newIndex;
                      }
                      else {
                          moved = true;
                      }
                      patch(prevChild, c2[newIndex], container, null, parentComponent, parentSuspense, isSVG, optimized);
                      patched++;
                  }
              }
              // 5.3 move and mount
              // generate longest stable subsequence only when nodes have moved
              const increasingNewIndexSequence = moved
                  ? getSequence(newIndexToOldIndexMap)
                  : EMPTY_ARR;
              j = increasingNewIndexSequence.length - 1;
              // looping backwards so that we can use last patched node as anchor
              for (i = toBePatched - 1; i >= 0; i--) {
                  const nextIndex = s2 + i;
                  const nextChild = c2[nextIndex];
                  const anchor = nextIndex + 1 < l2
                      ? c2[nextIndex + 1].el
                      : parentAnchor;
                  if (newIndexToOldIndexMap[i] === 0) {
                      // mount new
                      patch(null, nextChild, container, anchor, parentComponent, parentSuspense, isSVG);
                  }
                  else if (moved) {
                      // move if:
                      // There is no stable subsequence (e.g. a reverse)
                      // OR current node is not among the stable sequence
                      if (j < 0 || i !== increasingNewIndexSequence[j]) {
                          move(nextChild, container, anchor);
                      }
                      else {
                          j--;
                      }
                  }
              }
          }
      }
      function move(vnode, container, anchor) {
          if (vnode.component !== null) {
              move(vnode.component.subTree, container, anchor);
              return;
          }
          if ( vnode.type === Suspense) {
              const suspense = vnode.suspense;
              move(suspense.isResolved ? suspense.subTree : suspense.fallbackTree, container, anchor);
              suspense.container = container;
              return;
          }
          if (vnode.type === Fragment) {
              hostInsert(vnode.el, container, anchor);
              const children = vnode.children;
              for (let i = 0; i < children.length; i++) {
                  move(children[i], container, anchor);
              }
              hostInsert(vnode.anchor, container, anchor);
          }
          else {
              hostInsert(vnode.el, container, anchor);
          }
      }
      function unmount(vnode, parentComponent, parentSuspense, doRemove) {
          const { props, ref, type, component, suspense, children, dynamicChildren, shapeFlag, anchor } = vnode;
          // unset ref
          if (ref !== null && parentComponent !== null) {
              setRef(ref, null, parentComponent, null);
          }
          if (component != null) {
              unmountComponent(component, parentSuspense, doRemove);
              return;
          }
          if ( suspense != null) {
              unmountSuspense(suspense, parentComponent, parentSuspense, doRemove);
              return;
          }
          if (props != null && props.vnodeBeforeUnmount != null) {
              invokeDirectiveHook(props.vnodeBeforeUnmount, parentComponent, vnode);
          }
          const shouldRemoveChildren = type === Fragment && doRemove;
          if (dynamicChildren != null) {
              unmountChildren(dynamicChildren, parentComponent, parentSuspense, shouldRemoveChildren);
          }
          else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
              unmountChildren(children, parentComponent, parentSuspense, shouldRemoveChildren);
          }
          if (doRemove) {
              hostRemove(vnode.el);
              if (anchor != null)
                  hostRemove(anchor);
          }
          if (props != null && props.vnodeUnmounted != null) {
              queuePostRenderEffect(() => {
                  invokeDirectiveHook(props.vnodeUnmounted, parentComponent, vnode);
              }, parentSuspense);
          }
      }
      function unmountComponent(instance, parentSuspense, doRemove) {
          const { bum, effects, update, subTree, um } = instance;
          // beforeUnmount hook
          if (bum !== null) {
              invokeHooks(bum);
          }
          if (effects !== null) {
              for (let i = 0; i < effects.length; i++) {
                  stop(effects[i]);
              }
          }
          // update may be null if a component is unmounted before its async
          // setup has resolved.
          if (update !== null) {
              stop(update);
              unmount(subTree, instance, parentSuspense, doRemove);
          }
          // unmounted hook
          if (um !== null) {
              queuePostRenderEffect(um, parentSuspense);
          }
          queuePostFlushCb(() => {
              instance.isUnmounted = true;
          });
          // A component with async dep inside a pending suspense is unmounted before
          // its async dep resolves. This should remove the dep from the suspense, and
          // cause the suspense to resolve immediately if that was the last dep.
          if (
              parentSuspense !== null &&
              !parentSuspense.isResolved &&
              !parentSuspense.isUnmounted &&
              instance.asyncDep !== null &&
              !instance.asyncResolved) {
              parentSuspense.deps--;
              if (parentSuspense.deps === 0) {
                  resolveSuspense(parentSuspense);
              }
          }
      }
      function unmountSuspense(suspense, parentComponent, parentSuspense, doRemove) {
          suspense.isUnmounted = true;
          unmount(suspense.subTree, parentComponent, parentSuspense, doRemove);
          if (!suspense.isResolved) {
              unmount(suspense.fallbackTree, parentComponent, parentSuspense, doRemove);
          }
      }
      function unmountChildren(children, parentComponent, parentSuspense, doRemove, start = 0) {
          for (let i = start; i < children.length; i++) {
              unmount(children[i], parentComponent, parentSuspense, doRemove);
          }
      }
      function getNextHostNode({ component, suspense, anchor, el }) {
          if (component !== null) {
              return getNextHostNode(component.subTree);
          }
          if ( suspense !== null) {
              return getNextHostNode(suspense.isResolved ? suspense.subTree : suspense.fallbackTree);
          }
          return hostNextSibling((anchor || el));
      }
      function setRef(ref, oldRef, parent, value) {
          const refs = parent.refs === EMPTY_OBJ ? (parent.refs = {}) : parent.refs;
          const renderContext = toRaw(parent.renderContext);
          // unset old ref
          if (oldRef !== null && oldRef !== ref) {
              if (isString(oldRef)) {
                  refs[oldRef] = null;
                  const oldSetupRef = renderContext[oldRef];
                  if (isRef(oldSetupRef)) {
                      oldSetupRef.value = null;
                  }
              }
              else if (isRef(oldRef)) {
                  oldRef.value = null;
              }
          }
          if (isString(ref)) {
              const setupRef = renderContext[ref];
              if (isRef(setupRef)) {
                  setupRef.value = value;
              }
              refs[ref] = value;
          }
          else if (isRef(ref)) {
              ref.value = value;
          }
          else if (isFunction(ref)) {
              ref(value, refs);
          }
          else {
              warn('Invalid template ref type:', value, `(${typeof value})`);
          }
      }
      function render(vnode, rawContainer) {
          let container = rawContainer;
          if (isString(container)) {
              container = hostQuerySelector(container);
              if (!container) {
                  {
                      warn(`Failed to locate root container: ` + `querySelector returned null.`);
                  }
                  return;
              }
          }
          if (vnode == null) {
              if (container._vnode) {
                  unmount(container._vnode, null, null, true);
              }
          }
          else {
              patch(container._vnode || null, vnode, container);
          }
          flushPostFlushCbs();
          container._vnode = vnode;
      }
      return {
          render,
          createApp: createAppAPI(render)
      };
  }
  // https://en.wikipedia.org/wiki/Longest_increasing_subsequence
  function getSequence(arr) {
      const p = arr.slice();
      const result = [0];
      let i, j, u, v, c;
      const len = arr.length;
      for (i = 0; i < len; i++) {
          const arrI = arr[i];
          if (arrI !== 0) {
              j = result[result.length - 1];
              if (arr[j] < arrI) {
                  p[i] = j;
                  result.push(i);
                  continue;
              }
              u = 0;
              v = result.length - 1;
              while (u < v) {
                  c = ((u + v) / 2) | 0;
                  if (arr[result[c]] < arrI) {
                      u = c + 1;
                  }
                  else {
                      v = c;
                  }
              }
              if (arrI < arr[result[u]]) {
                  if (u > 0) {
                      p[i] = result[u - 1];
                  }
                  result[u] = i;
              }
          }
      }
      u = result.length;
      v = result[u - 1];
      while (u-- > 0) {
          result[u] = v;
          v = p[v];
      }
      return result;
  }

  const invoke = (fn) => fn();
  // implementation
  function watch(effectOrSource, cbOrOptions, options) {
      if (isFunction(cbOrOptions)) {
          // effect callback as 2nd argument - this is a source watcher
          return doWatch(effectOrSource, cbOrOptions, options);
      }
      else {
          // 2nd argument is either missing or an options object
          // - this is a simple effect watcher
          return doWatch(effectOrSource, null, cbOrOptions);
      }
  }
  function doWatch(source, cb, { lazy, deep, flush, onTrack, onTrigger } = EMPTY_OBJ) {
      const instance = currentInstance;
      const suspense = currentSuspense;
      let getter;
      if (isArray(source)) {
          getter = () => source.map(s => isRef(s)
              ? s.value
              : callWithErrorHandling(s, instance, 2 /* WATCH_GETTER */));
      }
      else if (isRef(source)) {
          getter = () => source.value;
      }
      else if (cb) {
          // getter with cb
          getter = () => callWithErrorHandling(source, instance, 2 /* WATCH_GETTER */);
      }
      else {
          // no cb -> simple effect
          getter = () => {
              if (instance && instance.isUnmounted) {
                  return;
              }
              if (cleanup) {
                  cleanup();
              }
              return callWithErrorHandling(source, instance, 3 /* WATCH_CALLBACK */, [registerCleanup]);
          };
      }
      if (deep) {
          const baseGetter = getter;
          getter = () => traverse(baseGetter());
      }
      let cleanup;
      const registerCleanup = (fn) => {
          // TODO wrap the cleanup fn for error handling
          cleanup = runner.onStop = () => {
              callWithErrorHandling(fn, instance, 4 /* WATCH_CLEANUP */);
          };
      };
      let oldValue = isArray(source) ? [] : undefined;
      const applyCb = cb
          ? () => {
              if (instance && instance.isUnmounted) {
                  return;
              }
              const newValue = runner();
              if (deep || newValue !== oldValue) {
                  // cleanup before running cb again
                  if (cleanup) {
                      cleanup();
                  }
                  callWithAsyncErrorHandling(cb, instance, 3 /* WATCH_CALLBACK */, [
                      newValue,
                      oldValue,
                      registerCleanup
                  ]);
                  oldValue = newValue;
              }
          }
          : void 0;
      let scheduler;
      if (flush === 'sync') {
          scheduler = invoke;
      }
      else if (flush === 'pre') {
          scheduler = job => {
              if (!instance || instance.vnode.el != null) {
                  queueJob(job);
              }
              else {
                  // with 'pre' option, the first call must happen before
                  // the component is mounted so it is called synchronously.
                  job();
              }
          };
      }
      else {
          scheduler = job => {
              queuePostRenderEffect(job, suspense);
          };
      }
      const runner = effect(getter, {
          lazy: true,
          // so it runs before component update effects in pre flush mode
          computed: true,
          onTrack,
          onTrigger,
          scheduler: applyCb ? () => scheduler(applyCb) : scheduler
      });
      if (!lazy) {
          if (applyCb) {
              scheduler(applyCb);
          }
          else {
              scheduler(runner);
          }
      }
      else {
          oldValue = runner();
      }
      recordEffect(runner);
      return () => {
          stop(runner);
      };
  }
  // this.$watch
  function instanceWatch(source, cb, options) {
      const ctx = this.renderProxy;
      const getter = isString(source) ? () => ctx[source] : source.bind(ctx);
      const stop = watch(getter, cb.bind(ctx), options);
      onBeforeUnmount(stop, this);
      return stop;
  }
  function traverse(value, seen = new Set()) {
      if (!isObject(value) || seen.has(value)) {
          return;
      }
      seen.add(value);
      if (isArray(value)) {
          for (let i = 0; i < value.length; i++) {
              traverse(value[i], seen);
          }
      }
      else if (value instanceof Map) {
          value.forEach((v, key) => {
              // to register mutation dep for existing keys
              traverse(value.get(key), seen);
          });
      }
      else if (value instanceof Set) {
          value.forEach(v => {
              traverse(v, seen);
          });
      }
      else {
          for (const key in value) {
              traverse(value[key], seen);
          }
      }
      return value;
  }

  const PublicInstanceProxyHandlers = {
      get(target, key) {
          const { renderContext, data, props, propsProxy } = target;
          if (data !== EMPTY_OBJ && hasOwn(data, key)) {
              return data[key];
          }
          else if (hasOwn(renderContext, key)) {
              return renderContext[key];
          }
          else if (hasOwn(props, key)) {
              // return the value from propsProxy for ref unwrapping and readonly
              return propsProxy[key];
          }
          else {
              // TODO simplify this?
              switch (key) {
                  case '$data':
                      return data;
                  case '$props':
                      return propsProxy;
                  case '$attrs':
                      return target.attrs;
                  case '$slots':
                      return target.slots;
                  case '$refs':
                      return target.refs;
                  case '$parent':
                      return target.parent;
                  case '$root':
                      return target.root;
                  case '$emit':
                      return target.emit;
                  case '$el':
                      return target.vnode.el;
                  case '$options':
                      return target.type;
                  default:
                      // methods are only exposed when options are supported
                      {
                          switch (key) {
                              case '$forceUpdate':
                                  return target.update;
                              case '$nextTick':
                                  return nextTick;
                              case '$watch':
                                  return instanceWatch.bind(target);
                          }
                      }
                      return target.user[key];
              }
          }
      },
      // this trap is only called in browser-compiled render functions that use
      // `with (this) {}`
      has(_, key) {
          return key[0] !== '_' && !globalsWhitelist.has(key);
      },
      set(target, key, value) {
          const { data, renderContext } = target;
          if (data !== EMPTY_OBJ && hasOwn(data, key)) {
              data[key] = value;
          }
          else if (hasOwn(renderContext, key)) {
              renderContext[key] = value;
          }
          else if (key[0] === '$' && key.slice(1) in target) {
              // TODO warn attempt of mutating public property
              return false;
          }
          else if (key in target.props) {
              // TODO warn attempt of mutating prop
              return false;
          }
          else {
              target.user[key] = value;
          }
          return true;
      }
  };

  function provide(key, value) {
      if (!currentInstance) {
          {
              warn(`provide() can only be used inside setup().`);
          }
      }
      else {
          let provides = currentInstance.provides;
          // by default an instance inherits its parent's provides object
          // but when it needs to provide values of its own, it creates its
          // own provides object using parent provides object as prototype.
          // this way in `inject` we can simply look up injections from direct
          // parent and let the prototype chain do the work.
          const parentProvides = currentInstance.parent && currentInstance.parent.provides;
          if (parentProvides === provides) {
              provides = currentInstance.provides = Object.create(parentProvides);
          }
          provides[key] = value;
      }
  }
  function inject(key, defaultValue) {
      if (currentInstance) {
          const provides = currentInstance.provides;
          if (key in provides) {
              return provides[key];
          }
          else if (defaultValue !== undefined) {
              return defaultValue;
          }
          else {
              warn(`injection "${key}" not found.`);
          }
      }
      else {
          warn(`inject() can only be used inside setup().`);
      }
  }

  function applyOptions(instance, options, asMixin = false) {
      const renderContext = instance.renderContext === EMPTY_OBJ
          ? (instance.renderContext = reactive({}))
          : instance.renderContext;
      const ctx = instance.renderProxy;
      const { 
      // composition
      mixins, extends: extendsOptions, 
      // state
      data: dataOptions, computed: computedOptions, methods, watch: watchOptions, provide: provideOptions, inject: injectOptions, 
      // assets
      components, directives, 
      // lifecycle
      beforeMount, mounted, beforeUpdate, updated, 
      // TODO activated
      // TODO deactivated
      beforeUnmount, unmounted, renderTracked, renderTriggered, errorCaptured } = options;
      const globalMixins = instance.appContext.mixins;
      // applyOptions is called non-as-mixin once per instance
      if (!asMixin) {
          callSyncHook('beforeCreate', options, ctx, globalMixins);
          // global mixins are applied first
          applyMixins(instance, globalMixins);
      }
      // extending a base component...
      if (extendsOptions) {
          applyOptions(instance, extendsOptions, true);
      }
      // local mixins
      if (mixins) {
          applyMixins(instance, mixins);
      }
      // state options
      if (dataOptions) {
          const data = isFunction(dataOptions) ? dataOptions.call(ctx) : dataOptions;
          if (!isObject(data)) {
               warn(`data() should return an object.`);
          }
          else if (instance.data === EMPTY_OBJ) {
              instance.data = reactive(data);
          }
          else {
              // existing data: this is a mixin or extends.
              extend(instance.data, data);
          }
      }
      if (computedOptions) {
          for (const key in computedOptions) {
              const opt = computedOptions[key];
              renderContext[key] = isFunction(opt)
                  ? computed$1(opt.bind(ctx))
                  : computed$1({
                      get: opt.get.bind(ctx),
                      set: opt.set.bind(ctx)
                  });
          }
      }
      if (methods) {
          for (const key in methods) {
              renderContext[key] = methods[key].bind(ctx);
          }
      }
      if (watchOptions) {
          for (const key in watchOptions) {
              const raw = watchOptions[key];
              const getter = () => ctx[key];
              if (isString(raw)) {
                  const handler = renderContext[raw];
                  if (isFunction(handler)) {
                      watch(getter, handler);
                  }
              }
              else if (isFunction(raw)) {
                  watch(getter, raw.bind(ctx));
              }
              else if (isObject(raw)) {
                  // TODO 2.x compat
                  watch(getter, raw.handler.bind(ctx), raw);
              }
          }
      }
      if (provideOptions) {
          const provides = isFunction(provideOptions)
              ? provideOptions.call(ctx)
              : provideOptions;
          for (const key in provides) {
              provide(key, provides[key]);
          }
      }
      if (injectOptions) {
          if (isArray(injectOptions)) {
              for (let i = 0; i < injectOptions.length; i++) {
                  const key = injectOptions[i];
                  renderContext[key] = inject(key);
              }
          }
          else {
              for (const key in injectOptions) {
                  const opt = injectOptions[key];
                  if (isObject(opt)) {
                      renderContext[key] = inject(opt.from, opt.default);
                  }
                  else {
                      renderContext[key] = inject(opt);
                  }
              }
          }
      }
      // asset options
      if (components) {
          extend(instance.components, components);
      }
      if (directives) {
          extend(instance.directives, directives);
      }
      // lifecycle options
      if (!asMixin) {
          callSyncHook('created', options, ctx, globalMixins);
      }
      if (beforeMount) {
          onBeforeMount(beforeMount.bind(ctx));
      }
      if (mounted) {
          onMounted(mounted.bind(ctx));
      }
      if (beforeUpdate) {
          onBeforeUpdate(beforeUpdate.bind(ctx));
      }
      if (updated) {
          onUpdated(updated.bind(ctx));
      }
      if (errorCaptured) {
          onErrorCaptured(errorCaptured.bind(ctx));
      }
      if (renderTracked) {
          onRenderTracked(renderTracked.bind(ctx));
      }
      if (renderTriggered) {
          onRenderTriggered(renderTriggered.bind(ctx));
      }
      if (beforeUnmount) {
          onBeforeUnmount(beforeUnmount.bind(ctx));
      }
      if (unmounted) {
          onUnmounted(unmounted.bind(ctx));
      }
  }
  function callSyncHook(name, options, ctx, globalMixins) {
      callHookFromMixins(name, globalMixins, ctx);
      const baseHook = options.extends && options.extends[name];
      if (baseHook) {
          baseHook.call(ctx);
      }
      const mixins = options.mixins;
      if (mixins) {
          callHookFromMixins(name, mixins, ctx);
      }
      const selfHook = options[name];
      if (selfHook) {
          selfHook.call(ctx);
      }
  }
  function callHookFromMixins(name, mixins, ctx) {
      for (let i = 0; i < mixins.length; i++) {
          const fn = mixins[i][name];
          if (fn) {
              fn.call(ctx);
          }
      }
  }
  function applyMixins(instance, mixins) {
      for (let i = 0; i < mixins.length; i++) {
          applyOptions(instance, mixins[i], true);
      }
  }

  const emptyAppContext = createAppContext();
  function createComponentInstance(vnode, parent) {
      // inherit parent app context - or - if root, adopt from root vnode
      const appContext = (parent ? parent.appContext : vnode.appContext) || emptyAppContext;
      const instance = {
          vnode,
          parent,
          appContext,
          type: vnode.type,
          root: null,
          next: null,
          subTree: null,
          update: null,
          render: null,
          renderProxy: null,
          propsProxy: null,
          setupContext: null,
          effects: null,
          provides: parent ? parent.provides : Object.create(appContext.provides),
          // setup context properties
          renderContext: EMPTY_OBJ,
          data: EMPTY_OBJ,
          props: EMPTY_OBJ,
          attrs: EMPTY_OBJ,
          slots: EMPTY_OBJ,
          refs: EMPTY_OBJ,
          // per-instance asset storage (mutable during options resolution)
          components: Object.create(appContext.components),
          directives: Object.create(appContext.directives),
          // async dependency management
          asyncDep: null,
          asyncResult: null,
          asyncResolved: false,
          // user namespace for storing whatever the user assigns to `this`
          user: {},
          // lifecycle hooks
          // not using enums here because it results in computed properties
          isUnmounted: false,
          bc: null,
          c: null,
          bm: null,
          m: null,
          bu: null,
          u: null,
          um: null,
          bum: null,
          da: null,
          a: null,
          rtg: null,
          rtc: null,
          ec: null,
          emit: (event, ...args) => {
              const props = instance.vnode.props || EMPTY_OBJ;
              const handler = props[`on${event}`] || props[`on${capitalize(event)}`];
              if (handler) {
                  if (isArray(handler)) {
                      for (let i = 0; i < handler.length; i++) {
                          callWithAsyncErrorHandling(handler[i], instance, 6 /* COMPONENT_EVENT_HANDLER */, args);
                      }
                  }
                  else {
                      callWithAsyncErrorHandling(handler, instance, 6 /* COMPONENT_EVENT_HANDLER */, args);
                  }
              }
          }
      };
      instance.root = parent ? parent.root : instance;
      return instance;
  }
  let currentInstance = null;
  let currentSuspense = null;
  const setCurrentInstance = (instance) => {
      currentInstance = instance;
  };
  function setupStatefulComponent(instance, parentSuspense) {
      const Component = instance.type;
      // 1. create render proxy
      instance.renderProxy = new Proxy(instance, PublicInstanceProxyHandlers);
      // 2. create props proxy
      // the propsProxy is a reactive AND readonly proxy to the actual props.
      // it will be updated in resolveProps() on updates before render
      const propsProxy = (instance.propsProxy = readonly(instance.props));
      // 3. call setup()
      const { setup } = Component;
      if (setup) {
          const setupContext = (instance.setupContext =
              setup.length > 1 ? createSetupContext(instance) : null);
          currentInstance = instance;
          currentSuspense = parentSuspense;
          const setupResult = callWithErrorHandling(setup, instance, 0 /* SETUP_FUNCTION */, [propsProxy, setupContext]);
          currentInstance = null;
          currentSuspense = null;
          if (setupResult &&
              isFunction(setupResult.then) &&
              isFunction(setupResult.catch)) {
              {
                  // async setup returned Promise.
                  // bail here and wait for re-entry.
                  instance.asyncDep = setupResult;
              }
              return;
          }
          else {
              handleSetupResult(instance, setupResult, parentSuspense);
          }
      }
      else {
          finishComponentSetup(instance, parentSuspense);
      }
  }
  function handleSetupResult(instance, setupResult, parentSuspense) {
      if (isFunction(setupResult)) {
          // setup returned an inline render function
          instance.render = setupResult;
      }
      else if (isObject(setupResult)) {
          if ( isVNode(setupResult)) {
              warn(`setup() should not return VNodes directly - ` +
                  `return a render function instead.`);
          }
          // setup returned bindings.
          // assuming a render function compiled from template is present.
          instance.renderContext = reactive(setupResult);
      }
      else if ( setupResult !== undefined) {
          warn(`setup() should return an object. Received: ${setupResult === null ? 'null' : typeof setupResult}`);
      }
      finishComponentSetup(instance, parentSuspense);
  }
  let compile$1;
  function finishComponentSetup(instance, parentSuspense) {
      const Component = instance.type;
      if (!instance.render) {
          if (Component.template && !Component.render) {
              if (compile$1) {
                  Component.render = compile$1(Component.template, {
                      onError(err) { }
                  });
              }
              else {
                  warn(`Component provides template but the build of Vue you are running ` +
                      `does not support on-the-fly template compilation. Either use the ` +
                      `full build or pre-compile the template using Vue CLI.`);
              }
          }
          if ( !Component.render) {
              warn(`Component is missing render function. Either provide a template or ` +
                  `return a render function from setup().`);
          }
          instance.render = (Component.render || NOOP);
      }
      // support for 2.x options
      {
          currentInstance = instance;
          currentSuspense = parentSuspense;
          applyOptions(instance, Component);
          currentInstance = null;
          currentSuspense = null;
      }
      if (instance.renderContext === EMPTY_OBJ) {
          instance.renderContext = reactive({});
      }
  }
  // used to identify a setup context proxy
  const SetupProxySymbol = Symbol();
  const SetupProxyHandlers = {};
  ['attrs', 'slots', 'refs'].forEach((type) => {
      SetupProxyHandlers[type] = {
          get: (instance, key) => instance[type][key],
          has: (instance, key) => key === SetupProxySymbol || key in instance[type],
          ownKeys: instance => Reflect.ownKeys(instance[type]),
          // this is necessary for ownKeys to work properly
          getOwnPropertyDescriptor: (instance, key) => Reflect.getOwnPropertyDescriptor(instance[type], key),
          set: () => false,
          deleteProperty: () => false
      };
  });
  function createSetupContext(instance) {
      const context = {
          // attrs, slots & refs are non-reactive, but they need to always expose
          // the latest values (instance.xxx may get replaced during updates) so we
          // need to expose them through a proxy
          attrs: new Proxy(instance, SetupProxyHandlers.attrs),
          slots: new Proxy(instance, SetupProxyHandlers.slots),
          refs: new Proxy(instance, SetupProxyHandlers.refs),
          emit: instance.emit
      };
      return  Object.freeze(context) ;
  }

  // record effects created during a component's setup() so that they can be
  // stopped when the component unmounts
  function recordEffect(effect) {
      if (currentInstance) {
          (currentInstance.effects || (currentInstance.effects = [])).push(effect);
      }
  }
  function computed$1(getterOrOptions) {
      const c = computed(getterOrOptions);
      recordEffect(c.effect);
      return c;
  }

  // Actual implementation
  function h(type, propsOrChildren, children) {
      if (arguments.length === 2) {
          if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
              // props without children
              return createVNode(type, propsOrChildren);
          }
          else {
              // omit props
              return createVNode(type, null, propsOrChildren);
          }
      }
      else {
          return createVNode(type, propsOrChildren, children);
      }
  }

  // but the flags are also exported as an actual object for external use
  const PublicShapeFlags = {
      ELEMENT: 1 /* ELEMENT */,
      FUNCTIONAL_COMPONENT: 2 /* FUNCTIONAL_COMPONENT */,
      STATEFUL_COMPONENT: 4 /* STATEFUL_COMPONENT */,
      TEXT_CHILDREN: 8 /* TEXT_CHILDREN */,
      ARRAY_CHILDREN: 16 /* ARRAY_CHILDREN */,
      SLOTS_CHILDREN: 32 /* SLOTS_CHILDREN */,
      COMPONENT: 6 /* COMPONENT */
  };

  const doc = document;
  const svgNS = 'http://www.w3.org/2000/svg';
  const nodeOps = {
      insert: (child, parent, anchor) => {
          if (anchor != null) {
              parent.insertBefore(child, anchor);
          }
          else {
              parent.appendChild(child);
          }
      },
      remove: (child) => {
          const parent = child.parentNode;
          if (parent != null) {
              parent.removeChild(child);
          }
      },
      createElement: (tag, isSVG) => isSVG ? doc.createElementNS(svgNS, tag) : doc.createElement(tag),
      createText: (text) => doc.createTextNode(text),
      createComment: (text) => doc.createComment(text),
      setText: (node, text) => {
          node.nodeValue = text;
      },
      setElementText: (el, text) => {
          el.textContent = text;
      },
      parentNode: (node) => node.parentNode,
      nextSibling: (node) => node.nextSibling,
      querySelector: (selector) => doc.querySelector(selector)
  };

  // compiler should normalize class + :class bindings on the same element
  // into a single binding ['staticClass', dynamic]
  function patchClass(el, value, isSVG) {
      // directly setting className should be faster than setAttribute in theory
      if (isSVG) {
          el.setAttribute('class', value);
      }
      else {
          el.className = value;
      }
  }

  function patchStyle(el, prev, next) {
      const { style } = el;
      if (!next) {
          el.removeAttribute('style');
      }
      else if (isString(next)) {
          style.cssText = next;
      }
      else {
          for (const key in next) {
              style[key] = next[key];
          }
          if (prev && !isString(prev)) {
              for (const key in prev) {
                  if (!next[key]) {
                      style[key] = '';
                  }
              }
          }
      }
  }

  const xlinkNS = 'http://www.w3.org/1999/xlink';
  function isXlink(name) {
      return name.charAt(5) === ':' && name.slice(0, 5) === 'xlink';
  }
  function getXlinkProp(name) {
      return isXlink(name) ? name.slice(6, name.length) : '';
  }
  function patchAttr(el, key, value, isSVG) {
      // isSVG short-circuits isXlink check
      if (isSVG && isXlink(key)) {
          if (value == null) {
              el.removeAttributeNS(xlinkNS, getXlinkProp(key));
          }
          else {
              el.setAttributeNS(xlinkNS, key, value);
          }
      }
      else {
          if (value == null) {
              el.removeAttribute(key);
          }
          else {
              el.setAttribute(key, value);
          }
      }
  }

  function patchDOMProp(el, key, value, 
  // the following args are passed only due to potential innerHTML/textContent
  // overriding existing VNodes, in which case the old tree must be properly
  // unmounted.
  prevChildren, parentComponent, parentSuspense, unmountChildren) {
      if ((key === 'innerHTML' || key === 'textContent') && prevChildren != null) {
          unmountChildren(prevChildren, parentComponent, parentSuspense);
      }
      el[key] = value == null ? '' : value;
  }

  // Async edge case fix requires storing an event listener's attach timestamp.
  let _getNow = Date.now;
  // Determine what event timestamp the browser is using. Annoyingly, the
  // timestamp can either be hi-res ( relative to page load) or low-res
  // (relative to UNIX epoch), so in order to compare time we have to use the
  // same timestamp type when saving the flush timestamp.
  if (typeof document !== 'undefined' &&
      _getNow() > document.createEvent('Event').timeStamp) {
      // if the low-res timestamp which is bigger than the event timestamp
      // (which is evaluated AFTER) it means the event is using a hi-res timestamp,
      // and we need to use the hi-res version for event listeners as well.
      _getNow = () => performance.now();
  }
  // To avoid the overhead of repeatedly calling performance.now(), we cache
  // and use the same timestamp for all event listeners attached in the same tick.
  let cachedNow = 0;
  const p$1 = Promise.resolve();
  const reset = () => {
      cachedNow = 0;
  };
  const getNow = () => cachedNow || (p$1.then(reset), (cachedNow = _getNow()));
  function patchEvent(el, name, prevValue, nextValue, instance = null) {
      const invoker = prevValue && prevValue.invoker;
      if (nextValue) {
          if (invoker) {
              prevValue.invoker = null;
              invoker.value = nextValue;
              nextValue.invoker = invoker;
              invoker.lastUpdated = getNow();
          }
          else {
              el.addEventListener(name, createInvoker(nextValue, instance));
          }
      }
      else if (invoker) {
          el.removeEventListener(name, invoker);
      }
  }
  function createInvoker(initialValue, instance) {
      const invoker = ((e) => {
          // async edge case #6566: inner click event triggers patch, event handler
          // attached to outer element during patch, and triggered again. This
          // happens because browsers fire microtask ticks between event propagation.
          // the solution is simple: we save the timestamp when a handler is attached,
          // and the handler would only fire if the event passed to it was fired
          // AFTER it was attached.
          if (e.timeStamp >= invoker.lastUpdated) {
              const args = [e];
              const value = invoker.value;
              if (isArray(value)) {
                  for (let i = 0; i < value.length; i++) {
                      callWithAsyncErrorHandling(value[i], instance, 5 /* NATIVE_EVENT_HANDLER */, args);
                  }
              }
              else {
                  callWithAsyncErrorHandling(value, instance, 5 /* NATIVE_EVENT_HANDLER */, args);
              }
          }
      });
      invoker.value = initialValue;
      initialValue.invoker = invoker;
      invoker.lastUpdated = getNow();
      return invoker;
  }

  function patchProp(el, key, nextValue, prevValue, isSVG, prevChildren, parentComponent, parentSuspense, unmountChildren) {
      switch (key) {
          // special
          case 'class':
              patchClass(el, nextValue, isSVG);
              break;
          case 'style':
              patchStyle(el, prevValue, nextValue);
              break;
          default:
              if (isOn(key)) {
                  patchEvent(el, key.slice(2).toLowerCase(), prevValue, nextValue, parentComponent);
              }
              else if (!isSVG && key in el) {
                  patchDOMProp(el, key, nextValue, prevChildren, parentComponent, parentSuspense, unmountChildren);
              }
              else {
                  patchAttr(el, key, nextValue, isSVG);
              }
              break;
      }
  }

  const { render, createApp } = createRenderer({
      patchProp,
      ...nodeOps
  });

  const compilerOptions = reactive({
      mode: 'module',
      prefixIdentifiers: false,
      hoistStatic: false
  });
  const App = {
      setup() {
          return () => [
              h('h1', `Vue 3 Template Explorer`),
              h('a', {
                  href: `https://github.com/vuejs/vue-next/tree/${"57a5c61"}`,
                  target: `_blank`
              }, `@${"57a5c61"}`),
              h('div', { id: 'options' }, [
                  // mode selection
                  h('span', { class: 'options-group' }, [
                      h('span', { class: 'label' }, 'Mode:'),
                      h('input', {
                          type: 'radio',
                          id: 'mode-module',
                          name: 'mode',
                          checked: compilerOptions.mode === 'module',
                          onChange() {
                              compilerOptions.mode = 'module';
                          }
                      }),
                      h('label', { for: 'mode-module' }, 'module'),
                      h('input', {
                          type: 'radio',
                          id: 'mode-function',
                          name: 'mode',
                          checked: compilerOptions.mode === 'function',
                          onChange() {
                              compilerOptions.mode = 'function';
                          }
                      }),
                      h('label', { for: 'mode-function' }, 'function')
                  ]),
                  // toggle prefixIdentifiers
                  h('input', {
                      type: 'checkbox',
                      id: 'prefix',
                      disabled: compilerOptions.mode === 'module',
                      checked: compilerOptions.prefixIdentifiers ||
                          compilerOptions.mode === 'module',
                      onChange(e) {
                          compilerOptions.prefixIdentifiers =
                              e.target.checked ||
                                  compilerOptions.mode === 'module';
                      }
                  }),
                  h('label', { for: 'prefix' }, 'prefixIdentifiers'),
                  // toggle hoistStatic
                  h('input', {
                      type: 'checkbox',
                      id: 'hoist',
                      checked: compilerOptions.hoistStatic,
                      onChange(e) {
                          compilerOptions.hoistStatic = e.target.checked;
                      }
                  }),
                  h('label', { for: 'hoist' }, 'hoistStatic')
              ])
          ];
      }
  };
  function initOptions() {
      createApp().mount(App, document.getElementById('header'));
  }

  window.init = () => {
      const monaco = window.monaco;
      const persistedState = JSON.parse(decodeURIComponent(window.location.hash.slice(1)) || `{}`);
      Object.assign(compilerOptions, persistedState.options);
      let lastSuccessfulCode = `/* See console for error */`;
      let lastSuccessfulMap = undefined;
      function compileCode(source) {
          console.clear();
          try {
              const { code, ast, map } = compile(source, {
                  filename: 'template.vue',
                  ...compilerOptions,
                  sourceMap: true,
                  onError: displayError
              });
              monaco.editor.setModelMarkers(editor.getModel(), `@vue/compiler-dom`, []);
              console.log(`AST: `, ast);
              lastSuccessfulCode = code + `\n\n// Check the console for the AST`;
              lastSuccessfulMap = new window._deps['source-map'].SourceMapConsumer(map);
              lastSuccessfulMap.computeColumnSpans();
          }
          catch (e) {
              console.error(e);
          }
          return lastSuccessfulCode;
      }
      function displayError(err) {
          const loc = err.loc;
          if (loc) {
              monaco.editor.setModelMarkers(editor.getModel(), `@vue/compiler-dom`, [
                  {
                      severity: monaco.MarkerSeverity.Error,
                      startLineNumber: loc.start.line,
                      startColumn: loc.start.column,
                      endLineNumber: loc.end.line,
                      endColumn: loc.end.column,
                      message: `Vue template compilation error: ${err.message}`,
                      code: String(err.code)
                  }
              ]);
          }
          throw err;
      }
      function reCompile() {
          const src = editor.getValue();
          // every time we re-compile, persist current state to URL
          window.location.hash = encodeURIComponent(JSON.stringify({
              src,
              options: compilerOptions
          }));
          const res = compileCode(src);
          if (res) {
              output.setValue(res);
          }
      }
      const sharedEditorOptions = {
          theme: 'vs-dark',
          fontSize: 14,
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          renderWhitespace: 'selection',
          contextmenu: false,
          minimap: {
              enabled: false
          }
      };
      const editor = monaco.editor.create(document.getElementById('source'), {
          value: persistedState.src || `<div>Hello World!</div>`,
          language: 'html',
          ...sharedEditorOptions
      });
      editor.getModel().updateOptions({
          tabSize: 2
      });
      const output = monaco.editor.create(document.getElementById('output'), {
          value: '',
          language: 'javascript',
          readOnly: true,
          ...sharedEditorOptions
      });
      output.getModel().updateOptions({
          tabSize: 2
      });
      // handle resize
      window.addEventListener('resize', () => {
          editor.layout();
          output.layout();
      });
      // update compile output when input changes
      editor.onDidChangeModelContent(debounce(reCompile));
      // highlight output code
      let prevOutputDecos = [];
      function clearOutputDecos() {
          prevOutputDecos = output.deltaDecorations(prevOutputDecos, []);
      }
      editor.onDidChangeCursorPosition(debounce(e => {
          clearEditorDecos();
          if (lastSuccessfulMap) {
              const pos = lastSuccessfulMap.generatedPositionFor({
                  source: 'template.vue',
                  line: e.position.lineNumber,
                  column: e.position.column - 1
              });
              if (pos.line != null && pos.column != null) {
                  prevOutputDecos = output.deltaDecorations(prevOutputDecos, [
                      {
                          range: new monaco.Range(pos.line, pos.column + 1, pos.line, pos.lastColumn ? pos.lastColumn + 2 : pos.column + 2),
                          options: {
                              inlineClassName: `highlight`
                          }
                      }
                  ]);
                  output.revealPositionInCenter({
                      lineNumber: pos.line,
                      column: pos.column + 1
                  });
              }
              else {
                  clearOutputDecos();
              }
          }
      }, 100));
      let previousEditorDecos = [];
      function clearEditorDecos() {
          previousEditorDecos = editor.deltaDecorations(previousEditorDecos, []);
      }
      output.onDidChangeCursorPosition(debounce(e => {
          clearOutputDecos();
          if (lastSuccessfulMap) {
              const pos = lastSuccessfulMap.originalPositionFor({
                  line: e.position.lineNumber,
                  column: e.position.column - 1
              });
              if (pos.line != null &&
                  pos.column != null &&
                  !(pos.line === 1 && pos.column === 0)) {
                  const translatedPos = {
                      column: pos.column + 1,
                      lineNumber: pos.line
                  };
                  previousEditorDecos = editor.deltaDecorations(previousEditorDecos, [
                      {
                          range: new monaco.Range(pos.line, pos.column + 1, pos.line, pos.column + 1),
                          options: {
                              isWholeLine: true,
                              className: `highlight`
                          }
                      }
                  ]);
                  editor.revealPositionInCenter(translatedPos);
              }
              else {
                  clearEditorDecos();
              }
          }
      }, 100));
      initOptions();
      watch(reCompile);
  };
  function debounce(fn, delay = 300) {
      let prevTimer = null;
      return ((...args) => {
          if (prevTimer) {
              clearTimeout(prevTimer);
          }
          prevTimer = setTimeout(() => {
              fn(...args);
              prevTimer = null;
          }, delay);
      });
  }

}());
