var VueDOMCompiler = (function (exports) {
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
  const isArray = Array.isArray;
  const isString = (val) => typeof val === 'string';
  const isSymbol = (val) => typeof val === 'symbol';
  const camelizeRE = /-(\w)/g;
  const camelize = (str) => {
      return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''));
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
  function createInterpolation(content, loc) {
      return {
          type: 5 /* INTERPOLATION */,
          loc,
          content: isString(content)
              ? createSimpleExpression(content, false, loc)
              : content
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
          },
          removeIdentifiers(exp) {
          },
          hoist(exp) {
              context.hoists.push(exp);
              return createSimpleExpression(`_hoisted_${context.hoists.length}`, false, exp.loc);
          }
      };
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
          map:  undefined
              ,
          helper(key) {
              const name = helperNameMap[key];
              return prefixIdentifiers ? name : `_${name}`;
          },
          push(code, node, openOnly) {
              context.code += code;
          },
          resetMapping(loc) {
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

  const transformIf = createStructuralDirectiveTransform(/^(if|else|else-if)$/, (node, dir, context) => {
      if (dir.name !== 'else' &&
          (!dir.exp || !dir.exp.content.trim())) {
          const loc = dir.exp ? dir.exp.loc : node.loc;
          context.onError(createCompilerError(35 /* X_IF_NO_EXPRESSION */, dir.loc));
          dir.exp = createSimpleExpression(`true`, false, loc);
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
          dir.exp);
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
              return () => {
                  scopes.vFor--;
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
          }
          if (iteratorMatch[2]) {
              const indexContent = iteratorMatch[2].trim();
              if (indexContent) {
                  result.index = createAliasExpression(loc, indexContent, exp.indexOf(indexContent, result.key
                      ? keyOffset + keyContent.length
                      : trimmedOffset + valueContent.length));
              }
          }
      }
      if (valueContent) {
          result.value = createAliasExpression(loc, valueContent, trimmedOffset);
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
              context.scopes.vSlot++;
              return () => {
                  context.scopes.vSlot--;
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
                  parseForExpression(vFor.exp);
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
      /* istanbul ignore if */
      {
          const onError = options.onError || defaultOnError;
          if (options.prefixIdentifiers === true) {
              onError(createCompilerError(47 /* X_PREFIX_ID_NOT_SUPPORTED */));
          }
          else if (options.mode === 'module') {
              onError(createCompilerError(48 /* X_MODULE_MODE_NOT_SUPPORTED */));
          }
      }
      const ast = isString(template) ? parse(template, options) : template;
      const prefixIdentifiers = !true &&
          (options.prefixIdentifiers === true || options.mode === 'module');
      transform(ast, {
          ...options,
          prefixIdentifiers,
          nodeTransforms: [
              transformIf,
              transformFor,
              ...( []),
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
          ...( parserOptionsMinimal ),
          nodeTransforms: [transformStyle, ...(options.nodeTransforms || [])],
          directiveTransforms: {
              // TODO include DOM-specific directiveTransforms
              ...(options.directiveTransforms || {})
          }
      });
  }

  exports.baseCompile = baseCompile;
  exports.compile = compile;
  exports.createArrayExpression = createArrayExpression;
  exports.createCallExpression = createCallExpression;
  exports.createCompilerError = createCompilerError;
  exports.createCompoundExpression = createCompoundExpression;
  exports.createConditionalExpression = createConditionalExpression;
  exports.createFunctionExpression = createFunctionExpression;
  exports.createInterpolation = createInterpolation;
  exports.createObjectExpression = createObjectExpression;
  exports.createObjectProperty = createObjectProperty;
  exports.createSequenceExpression = createSequenceExpression;
  exports.createSimpleExpression = createSimpleExpression;
  exports.createStructuralDirectiveTransform = createStructuralDirectiveTransform;
  exports.generate = generate;
  exports.locStub = locStub;
  exports.parse = parse;
  exports.transform = transform;

  return exports;

}({}));
