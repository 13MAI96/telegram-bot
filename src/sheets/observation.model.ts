export class Observation{
    holders: ObservationHolder[] = []

    toString(){
        return `
${this.holders.map(x => x.toString()).join('\n')}
        `
    }
}

export class ObservationHolder{
    name: string
    accounts: ObservationAccount[]

    constructor(name: string){
        this.name = name
        this.accounts = []
    }

    toString(): string{
        return `
${this.name}:
${this.accounts.map(x => x.toString()).join('\n')}
       `
    }
}

export class ObservationAccount{
    name: string
    amount: number

    constructor(name: string, amount: number){
        this.name = name
        this.amount = amount
    }

    toString(): string {
        return`* ${this.name}: ${this.amount}`
    }
}