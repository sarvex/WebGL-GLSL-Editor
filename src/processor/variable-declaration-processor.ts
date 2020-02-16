import { Helper } from './helper';
import { Interval } from '../scope/interval';
import { DocumentInfo } from '../core/document-info';
import { Scope } from '../scope/scope';
import { VariableDeclaration } from '../scope/variable/variable-declaration';
import { TypeUsageProcessor } from './type-usage-processor';
import { Single_variable_declarationContext, Variable_declarationContext } from '../_generated/AntlrGlslParser';
import { ArrayUsage } from '../scope/array-usage';
import { ExpressionProcessor } from './expression-processor';

export class VariableDeclarationProcessor {

    private static di: DocumentInfo;
    private static scope: Scope;

    private static initialize(scope: Scope, di: DocumentInfo): void {
        this.di = di;
        this.scope = scope;
    }

    public static searchVariableDeclaration(name: string, nameInterval: Interval, scope: Scope, di: DocumentInfo): VariableDeclaration {
        while (scope) {
            const td = scope.variableDeclarations.find(td => td.name === name && Helper.isALowerThanB(td.nameInterval, nameInterval));
            if (td) {
                return td;
            } else if (this.anyTypeOrFunction(name, nameInterval, scope)) {
                return null;
            }
            scope = scope.parent;
        }
        return di.builtin.variables.get(name) ?? null;
    }

    private static anyTypeOrFunction(name: string, nameInterval: Interval, scope: Scope): boolean {
        return scope.typeDeclarations.some(td => td.name === name && Helper.isALowerThanB(td.interval, nameInterval)) ||
            scope.functionPrototypes.some(fp => fp.name === name && Helper.isALowerThanB(fp.interval, nameInterval)) ||
            scope.functionDefinitions.some(fd => fd.name === name && Helper.isALowerThanB(fd.interval, nameInterval));
    }

    //
    //function parameter
    //
    public static getParameterDeclaration(svdc: Single_variable_declarationContext, scope: Scope, di: DocumentInfo): VariableDeclaration {
        this.initialize(scope, di);
        const ioc = svdc.identifier_optarray_optassignment() ? svdc.identifier_optarray_optassignment().identifier_optarray() : null;
        const name = ioc ? ioc.IDENTIFIER().text : null;
        const nameInterval = ioc ? Helper.getIntervalFromTerminalNode(ioc.IDENTIFIER()) : null;
        const declarationInterval = Helper.getIntervalFromParserRule(svdc);
        const arraySize = Helper.getArraySizeFromIdentifierOptarray(ioc, this.scope, this.di);
        const tu = TypeUsageProcessor.getParameterType(svdc.type_usage(), arraySize, scope, di);
        const vd = new VariableDeclaration(name, nameInterval, scope, false, declarationInterval, tu, true);
        scope.variableDeclarations.push(vd);
        return vd;
    }

    //
    //variable declaration, struct member
    //
    public static getDeclarations(vdc: Variable_declarationContext, scope: Scope, di: DocumentInfo): Array<VariableDeclaration> {
        this.initialize(scope, di);
        const ioocs = vdc.identifier_optarray_optassignment();
        const vds = new Array<VariableDeclaration>();
        if (ioocs.length) {
            for (let i = 0; i < ioocs.length; i++) {
                const iooc = ioocs[i];
                const array = Helper.getArraySizeFromIdentifierOptarrayOptassignment(iooc, this.scope, this.di);
                const exp = new ExpressionProcessor().processExpression(iooc.expression(), this.scope, this.di);
                const tu = TypeUsageProcessor.getMemberType(vdc.type_usage(), array, this.scope, this.di, i);
                const name = iooc.identifier_optarray().IDENTIFIER().text;
                const nameInterval = Helper.getIntervalFromTerminalNode(iooc.identifier_optarray().IDENTIFIER());
                const declarationInterval = Helper.getIntervalFromParserRules(vdc, iooc);
                const vd = new VariableDeclaration(name, nameInterval, this.scope, false, declarationInterval, tu, false);
                this.scope.variableDeclarations.push(vd);
                vds.push(vd);
            }
        } else {
            const tu = TypeUsageProcessor.getMemberType(vdc.type_usage(), new ArrayUsage(), this.scope, this.di, 0);
            const name = null;
            const nameInterval = null;
            const declarationInterval = Helper.getIntervalFromParserRule(vdc);
            const vd = new VariableDeclaration(name, nameInterval, this.scope, false, declarationInterval, tu, false);
            this.scope.variableDeclarations.push(vd);
            vds.push(vd);
        }
        return vds;
    }

}