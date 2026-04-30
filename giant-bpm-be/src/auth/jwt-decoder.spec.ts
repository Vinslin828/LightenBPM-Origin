import { Test, TestingModule } from '@nestjs/testing';
import { JwtDecoder } from './jwt-decoder';
import { JwtModule } from '@nestjs/jwt';

describe('JwtDecoder', () => {
  let decoder: JwtDecoder;

  const token =
    'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI3NjU0M2EyOC0xMjM0LTcwZjUtNTY3OC02MjNiMTcyYjZlZDMiLCJuYW1lIjoiR0JQTS1VU0VSIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImNvZ25pdG86dXNlcm5hbWUiOiJHQlBNLVVTRVJAbWFpbC50ZXN0LnRvIiwiZXhwIjoxNzcxOTA0MTc5LCJKb2JfR3JhZGUiOjIwLCJ0b2tlbl91c2UiOiJpZCIsIkJQTV9Sb2xlIjoiYWRtaW4ifQ.GYxyqxqrJo7-yc-L83l8dwtlGB-EGnz5zmFVcUs_La0';

  const expectedDecodedPayload = {
    sub: '76543a28-1234-70f5-5678-623b172b6ed3',
    name: 'GBPM-USER',
    email_verified: true,
    'cognito:username': 'GBPM-USER@mail.test.to',
    exp: 1771904179,
    Job_Grade: 20,
    token_use: 'id',
    BPM_Role: 'admin',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [JwtDecoder],
    }).compile();

    decoder = module.get<JwtDecoder>(JwtDecoder);
  });

  it('should be defined', () => {
    expect(decoder).toBeDefined();
  });

  describe('decode', () => {
    it('should decode a JWT token and return a stringified payload object', () => {
      const result = decoder.decode(token);
      console.log('Decode Result:', result);
      expect(result.sub).toBe(expectedDecodedPayload.sub);
      expect(result.name).toBe(expectedDecodedPayload.name);
      expect(result.Job_Grade).toBe(expectedDecodedPayload.Job_Grade);
      expect(result['BPM_Role']).toBe(expectedDecodedPayload.BPM_Role);
    });
  });
});
