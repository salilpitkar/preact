import { createElement as h, Component, render } from '../../src/index';
import { setupScratch, teardown, logCall, getLog, clearLog } from '../_util/helpers';
import { spy } from 'sinon';

/** @jsx h */

describe('keys', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {string[]} */
	let ops;

	function createStateful(name) {
		return class Stateful extends Component {
			componentDidUpdate() {
				ops.push(`Update ${name}`);
			}
			componentDidMount() {
				ops.push(`Mount ${name}`);
			}
			componentWillUnmount() {
				ops.push(`Unmount ${name}`);
			}
			render() {
				return <div>{name}</div>;
			}
		};
	}

	/** @type {(props: {values: any[]}) => any} */
	const List = props => (
		<ol>
			{props.values.map(value => <li key={value}>{value}</li>)}
		</ol>
	);

	/**
	 * Move an element in an array from one index to another
	 * @param {any[]} values The array of values
	 * @param {number} from The index to move from
	 * @param {number} to The index to move to
	 */
	function move(values, from, to) {
		const value = values[from];
		values.splice(from, 1);
		values.splice(to, 0, value);
	}

	before(() => {
		logCall(Element.prototype, 'appendChild');
		logCall(Element.prototype, 'insertBefore');
		logCall(Element.prototype, 'remove');
	});

	beforeEach(() => {
		scratch = setupScratch();
		ops = [];
	});

	afterEach(() => {
		teardown(scratch);
		clearLog();
	});

	// https://fb.me/react-special-props
	it('should not pass key in props', () => {
		const Foo = spy(() => null);
		render(<Foo key="foo" />, scratch);
		expect(Foo.args[0][0]).to.deep.equal({});
	});

	// See developit/preact-compat#21
	it('should remove orphaned keyed nodes', () => {
		render((
			<div>
				<div>1</div>
				<li key="a">a</li>
				<li key="b">b</li>
			</div>
		), scratch);

		render((
			<div>
				<div>2</div>
				<li key="b">b</li>
				<li key="c">c</li>
			</div>
		), scratch);

		expect(scratch.innerHTML).to.equal('<div><div>2</div><li>b</li><li>c</li></div>');
	});

	it('should remove keyed nodes (#232)', () => {
		class App extends Component {
			componentDidMount() {
				setTimeout(() => this.setState({ opened: true,loading: true }), 10);
				setTimeout(() => this.setState({ opened: true,loading: false }), 20);
			}

			render({ opened, loading }) {
				return (
					<BusyIndicator id="app" busy={loading}>
						<div>This div needs to be here for this to break</div>
						{ opened && !loading && <div>{[]}</div> }
					</BusyIndicator>
				);
			}
		}

		class BusyIndicator extends Component {
			render({ children, busy }) {
				return (<div class={busy ? 'busy' : ''}>
					{ children && children.length ? children : <div class="busy-placeholder" /> }
					<div class="indicator">
						<div>indicator</div>
						<div>indicator</div>
						<div>indicator</div>
					</div>
				</div>);
			}
		}

		render(<App />, scratch);
		render(<App opened loading />, scratch);
		render(<App opened />, scratch);

		const html = String(scratch.firstChild.innerHTML).replace(/ class=""/g, '');
		expect(html).to.equal('<div>This div needs to be here for this to break</div><div></div><div class="indicator"><div>indicator</div><div>indicator</div><div>indicator</div></div>');
	});

	it('should append new keyed elements', () => {
		const values = ['a', 'b'];

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('ab');

		values.push('c');
		clearLog();

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('abc');
		expect(getLog()).to.deep.equal({ '<li>.appendChild(#text)': 1, '<ol>ab.appendChild(<li>c)': 1 });
	});

	it('should remove keyed elements from the end', () => {
		const values = ['a', 'b', 'c', 'd'];

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('abcd');

		values.pop();
		clearLog();

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('abc');
		expect(getLog()).to.deep.equal({ '<li>d.remove()': 1 });
	});

	it('should prepend keyed elements to the beginning', () => {
		const values = ['b', 'c'];

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('bc');

		values.unshift('a');
		clearLog();

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('abc');
		expect(getLog()).to.deep.equal({ '<li>.appendChild(#text)': 1, '<ol>bc.insertBefore(<li>a, <li>b)': 1 });
	});

	it('should remove keyed elements from the beginning', () => {
		const values = ['z', 'a', 'b', 'c'];

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('zabc');

		values.shift();
		clearLog();

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('abc');
		expect(getLog()).to.deep.equal({ '<li>z.remove()': 1 });
	});

	it('should insert new keyed children in the middle', () => {
		const values = ['a', 'c'];

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('ac');

		values.splice(1, 0, 'b');
		clearLog();

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('abc');
		expect(getLog()).to.deep.equal({ '<li>.appendChild(#text)': 1, '<ol>ac.insertBefore(<li>b, <li>c)': 1 });
	});

	it('should remove keyed children from the middle', () => {
		const values = ['a', 'b', 'x', 'y', 'z', 'c', 'd'];

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('abxyzcd');

		values.splice(2, 3);
		clearLog();

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('abcd');
		expect(getLog()).to.deep.equal({ '<li>z.remove()': 1, '<li>y.remove()': 1, '<li>x.remove()': 1 });
	});

	it('should swap existing keyed children', () => {
		const values = ['a', 'b', 'c', 'd'];

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('abcd');

		// swap
		move(values, 1, 2);
		clearLog();

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('acbd');
		expect(getLog()).to.deep.equal({ '<ol>abcd.insertBefore(<li>b, <li>d)': 1 });

		// swap back
		move(values, 2, 1);
		clearLog();

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('abcd');
		expect(getLog()).to.deep.equal({ '<ol>acbd.insertBefore(<li>c, <li>d)': 1 });
	});

	it('should move keyed children to the end of the list', () => {
		const values = ['a', 'b', 'c', 'd'];

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('abcd');

		// move to end
		move(values, 0, values.length - 1);
		clearLog();

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('bcda');
		expect(getLog()).to.deep.equal({ '<ol>abcd.appendChild(<li>a)': 1 });

		// move to beginning
		move(values, values.length - 1, 0);
		clearLog();

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('abcd');
		expect(getLog()).to.deep.equal({ '<ol>bcda.insertBefore(<li>a, <li>b)': 1 });
	});

	it.skip('should not preserve state when a component\'s keys are different', () => {
		const Stateful = createStateful('Stateful');

		function Foo({ condition }) {
			return condition ? <Stateful key="a" /> : <Stateful key="b" />;
		}

		ops = [];
		render(<Foo condition />, scratch);
		expect(ops).to.deep.equal(['Mount Stateful'], 'initial mount');

		ops = [];
		render(<Foo condition={false} />, scratch);
		expect(ops).to.deep.equal(['Unmount Stateful', 'Mount Stateful'], 'switching keys 1');

		ops = [];
		render(<Foo condition />, scratch);
		expect(ops).to.deep.equal(['Unmount Stateful', 'Mount Stateful'], 'switching keys 2');
	});

	it.skip('should not preserve state between an unkeyed and keyed component', () => {
		// React and Preact v8 behavior: https://codesandbox.io/s/57prmy5mx

		const Stateful = createStateful('Stateful');

		function Foo({ keyed }) {
			return keyed ? <Stateful key="a" /> : <Stateful />;
		}

		ops = [];
		render(<Foo keyed />, scratch);
		expect(ops).to.deep.equal(['Mount Stateful'], 'initial mount with key');

		ops = [];
		render(<Foo keyed={false} />, scratch);
		expect(ops).to.deep.equal(['Unmount Stateful', 'Mount Stateful'], 'switching from keyed to unkeyed');

		ops = [];
		render(<Foo keyed />, scratch);
		expect(ops).to.deep.equal(['Unmount Stateful', 'Mount Stateful'], 'switching from unkeyed to keyed');
	});

	it('should not preserve state when keys change with multiple children', () => {
		// React & Preact v8 behavior: https://codesandbox.io/s/8l3p6lz9kj

		const Stateful1 = createStateful('Stateful1');
		const Stateful2 = createStateful('Stateful2');

		let Stateful1Ref;
		let Stateful2Ref;
		let Stateful1MovedRef;
		let Stateful2MovedRef;

		function Foo({ moved }) {
			return moved ? (
				<div>
					<div>1</div>
					<Stateful1 key="c" ref={c => Stateful1MovedRef = c} />
					<div>2</div>
					<Stateful2 key="d" ref={c => Stateful2MovedRef = c} />
				</div>
			) : (
				<div>
					<div>1</div>
					<Stateful1 key="a" ref={c => Stateful1Ref = c} />
					<div>2</div>
					<Stateful2 key="b" ref={c => Stateful2Ref = c} />
				</div>
			);
		}

		ops = [];
		render(<Foo moved={false} />, scratch);

		expect(ops).to.deep.equal(['Mount Stateful2', 'Mount Stateful1']);
		expect(Stateful1Ref).to.exist;
		expect(Stateful2Ref).to.exist;

		ops = [];
		render(<Foo moved />, scratch);

		expect(ops).to.deep.equal(['Unmount Stateful2', 'Unmount Stateful1', 'Mount Stateful2', 'Mount Stateful1']);
		expect(Stateful1MovedRef).to.not.equal(Stateful1Ref);
		expect(Stateful2MovedRef).to.not.equal(Stateful2Ref);

		ops = [];
		render(<Foo moved={false} />, scratch);

		expect(ops).to.deep.equal(['Unmount Stateful2', 'Unmount Stateful1', 'Mount Stateful2', 'Mount Stateful1']);
		expect(Stateful1Ref).to.not.equal(Stateful1MovedRef);
		expect(Stateful2Ref).to.not.equal(Stateful2MovedRef);
	});

	it('should preserve state when moving keyed children components', () => {
		// React & Preact v8 behavior: https://codesandbox.io/s/8l3p6lz9kj

		const Stateful1 = createStateful('Stateful1');
		const Stateful2 = createStateful('Stateful2');

		let Stateful1Ref;
		let Stateful2Ref;
		let Stateful1MovedRef;
		let Stateful2MovedRef;

		function Foo({ moved }) {
			return moved ? (
				<div>
					<div>1</div>
					<Stateful2 key="b" ref={c => Stateful2MovedRef = c} />
					<div>2</div>
					<Stateful1 key="a" ref={c => Stateful1MovedRef = c} />
				</div>
			) : (
				<div>
					<div>1</div>
					<Stateful1 key="a" ref={c => Stateful1Ref = c} />
					<div>2</div>
					<Stateful2 key="b" ref={c => Stateful2Ref = c} />
				</div>
			);
		}

		ops = [];
		render(<Foo moved={false} />, scratch);

		expect(ops).to.deep.equal(['Mount Stateful2', 'Mount Stateful1']);
		expect(Stateful1Ref).to.exist;
		expect(Stateful2Ref).to.exist;

		ops = [];
		render(<Foo moved />, scratch);

		expect(ops).to.deep.equal(['Update Stateful2', 'Update Stateful1']);
		expect(Stateful1MovedRef).to.equal(Stateful1Ref);
		expect(Stateful2MovedRef).to.equal(Stateful2Ref);

		ops = [];
		render(<Foo moved={false} />, scratch);

		expect(ops).to.deep.equal(['Update Stateful1', 'Update Stateful2']);
		expect(Stateful1Ref).to.equal(Stateful1MovedRef);
		expect(Stateful2Ref).to.equal(Stateful2MovedRef);
	});

	it('should not preserve state when switching between keyed and unkeyed components as children', () => {
		// React & Preact v8 behavior: https://codesandbox.io/s/8l3p6lz9kj

		const Stateful1 = createStateful('Stateful1');
		const Stateful2 = createStateful('Stateful2');

		let Stateful1Ref;
		let Stateful2Ref;
		let Stateful1MovedRef;
		let Stateful2MovedRef;

		function Foo({ unkeyed }) {
			return unkeyed ? (
				<div>
					<div>1</div>
					<Stateful1 ref={c => Stateful2MovedRef = c} />
					<div>2</div>
					<Stateful2 ref={c => Stateful1MovedRef = c} />
				</div>
			) : (
				<div>
					<div>1</div>
					<Stateful1 key="a" ref={c => Stateful1Ref = c} />
					<div>2</div>
					<Stateful2 key="b" ref={c => Stateful2Ref = c} />
				</div>
			);
		}

		ops = [];
		render(<Foo unkeyed={false} />, scratch);

		expect(ops).to.deep.equal(['Mount Stateful2', 'Mount Stateful1']);
		expect(Stateful1Ref).to.exist;
		expect(Stateful2Ref).to.exist;

		ops = [];
		render(<Foo unkeyed />, scratch);

		expect(ops).to.deep.equal(['Unmount Stateful2', 'Unmount Stateful1', 'Mount Stateful2', 'Mount Stateful1']);
		expect(Stateful1MovedRef).to.not.equal(Stateful1Ref);
		expect(Stateful2MovedRef).to.not.equal(Stateful2Ref);

		ops = [];
		render(<Foo unkeyed={false} />, scratch);

		expect(ops).to.deep.equal(['Unmount Stateful2', 'Unmount Stateful1', 'Mount Stateful2', 'Mount Stateful1']);
		expect(Stateful1Ref).to.not.equal(Stateful1MovedRef);
		expect(Stateful2Ref).to.not.equal(Stateful2MovedRef);
	});
});
