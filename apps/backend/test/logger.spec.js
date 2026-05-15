"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_service_1 = require("../src/common/logger/logger.service");
describe('PinoLogger', () => {
    let logger;
    beforeEach(() => {
        logger = new logger_service_1.PinoLogger();
    });
    it('should be defined', () => {
        expect(logger).toBeDefined();
    });
    describe('log', () => {
        it('should call logger.info', () => {
            const spy = jest.spyOn(logger['logger'], 'info');
            logger.log('test message', 'TestContext', { key: 'value' });
            expect(spy).toHaveBeenCalled();
        });
    });
    describe('error', () => {
        it('should call logger.error', () => {
            const spy = jest.spyOn(logger['logger'], 'error');
            logger.error('error message', 'stack trace', 'TestContext', { key: 'value' });
            expect(spy).toHaveBeenCalled();
        });
    });
    describe('warn', () => {
        it('should call logger.warn', () => {
            const spy = jest.spyOn(logger['logger'], 'warn');
            logger.warn('warn message', 'TestContext', { key: 'value' });
            expect(spy).toHaveBeenCalled();
        });
    });
    describe('debug', () => {
        it('should call logger.debug', () => {
            const spy = jest.spyOn(logger['logger'], 'debug');
            logger.debug('debug message', 'TestContext', { key: 'value' });
            expect(spy).toHaveBeenCalled();
        });
    });
    describe('verbose', () => {
        it('should call logger.trace', () => {
            const spy = jest.spyOn(logger['logger'], 'trace');
            logger.verbose('verbose message', 'TestContext', { key: 'value' });
            expect(spy).toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=logger.spec.js.map