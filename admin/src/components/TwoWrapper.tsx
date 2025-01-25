import * as React from "react";
import Two from "two.js";

export default class TwoWrapper extends React.Component {
    public two: Two | null = null;
    private twoRef = React.createRef<HTMLDivElement>();

    constructor(props: any) {
        super(props);
        this.two = new Two({
            //autostart: true,
            fitted: false
        });
    }

    componentDidMount() {
        if(!this.two) {
            return
        }
        if(!this.twoRef.current) {
            return
        }


        const texture = this.two.makeTexture('')


        this.two.makeCircle(30, 30, 15);
        this.two.appendTo(this.twoRef.current);
        this.two.update();
    }

    render() {
        return (
            <div>
                <div ref={this.twoRef} />
            </div>
        );
    }
}